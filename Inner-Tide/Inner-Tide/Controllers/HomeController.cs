using Inner_Tide.Data;
using Inner_Tide.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;

namespace Inner_Tide.Controllers
{
    public class HomeController : Controller {
        private readonly SignInManager<User> signInManager;
        private readonly UserManager<User> userManager;

        // Shared db connection obj
        ApplicationDbContext _context;

        public HomeController(ApplicationDbContext context, SignInManager<User> signInManager, UserManager<User> userManager) {
            this.signInManager = signInManager;
            this.userManager = userManager;
            _context = context;
        }

        public async Task<IActionResult> Index()
        {
            if (User.Identity?.IsAuthenticated != true)
            {
                return Redirect("/Users/Index");
            }

            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            ViewData["AccountId"] = user?.Id;
            if (!await _context.Aquariums.AnyAsync(aquarium => aquarium.UserId == user.Id)) {
                _context.Aquariums.Add(new Aquarium {
                    MaxFish = 10,
                    MaxObjects = 5,
                    CurrentFish = 0,
                    CurrentObjects = 0,
                    CompletionPercentage = 0,
                    UserId = user.Id
                });
                await _context.SaveChangesAsync();
            }

            return View("Index");
        }

        public IActionResult Privacy() {
            return View("Privacy");
        }

        [HttpGet]
        public async Task<IActionResult> GetTasks() {
            try {
                if (User.Identity?.IsAuthenticated != true) {
                    return Unauthorized();
                }

                var user = await userManager.GetUserAsync(User);

                if (user == null) {
                    return Unauthorized();
                }

                var categoryValues = await _context.UserCategoryValues
                    .AsNoTracking()
                    .SingleOrDefaultAsync(values => values.UserId == user.Id);
                if (categoryValues == null) {
                    return Conflict("Complete the setup quiz before generating personalized tasks.");
                }

                var now = DateTime.UtcNow;
                var dailyStart = now.Date;
                var weeklyStart = StartOfWeek(now.Date);
                var monthlyStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                var categoryScores = GetCategoryScores(categoryValues);

                await using var transaction = await _context.Database.BeginTransactionAsync();
                await EnsureTasksForPeriodAsync(user.Id, categoryScores, "Daily", 3, dailyStart, now);
                await EnsureTasksForPeriodAsync(user.Id, categoryScores, "Weekly", 5, weeklyStart, now);
                await EnsureTasksForPeriodAsync(user.Id, categoryScores, "Monthly", 7, monthlyStart, now);
                await transaction.CommitAsync();

                var userTasks = await _context.UserTasks
                    .Where(ut => ut.UserId == user.Id)
                    .Include(ut => ut.Task)
                    .Select(ut => new {
                        ut.UserTaskId,
                        ut.TaskId,
                        ut.Task.Title,
                        ut.Task.TimeFrame,
                        ut.Task.CoinReward,
                        ut.Multiplier,
                        ut.Priority,
                        ut.Completed,
                    })
                    .ToListAsync();

                return Json(new {
                    daily = userTasks.Where(t => string.Equals(t.TimeFrame, "Daily", StringComparison.OrdinalIgnoreCase)),
                    weekly = userTasks.Where(t => string.Equals(t.TimeFrame, "Weekly", StringComparison.OrdinalIgnoreCase)),
                    monthly = userTasks.Where(t => string.Equals(t.TimeFrame, "Monthly", StringComparison.OrdinalIgnoreCase))
                });
            } catch (Exception ex) {
                return StatusCode(500, ex.GetBaseException().Message);
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CompleteTask([FromForm] int userTaskId) {
            if (User.Identity?.IsAuthenticated != true) {
                return Unauthorized();
            }

            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            var userTask = await _context.UserTasks
                .Include(task => task.Task)
                .SingleOrDefaultAsync(task => task.UserId == user.Id && task.UserTaskId == userTaskId);
            if (userTask == null) {
                return NotFound();
            }

            if (userTask.Completed) {
                return Json(new { reward = 0, coins = user.CoinCount });
            }

            if (userTask.Task == null) {
                return StatusCode(500, "The task reward is unavailable.");
            }

            var reward = userTask.Task.CoinReward * userTask.Multiplier;
            userTask.Completed = true;
            user.CoinCount += reward;
            await _context.SaveChangesAsync();
            return Json(new { reward, coins = user.CoinCount });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> RegenerateTasks() {
            if (User.Identity?.IsAuthenticated != true) {
                return Unauthorized();
            }

            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            var categoryValues = await _context.UserCategoryValues
                .AsNoTracking()
                .SingleOrDefaultAsync(values => values.UserId == user.Id);
            if (categoryValues == null) {
                return Conflict("Complete the setup quiz before generating personalized tasks.");
            }

            var account = await _context.Users.SingleOrDefaultAsync(candidate => candidate.Id == user.Id);
            if (account == null) {
                return Unauthorized();
            }

            var regenerationCost = GetTaskRegenerationCost(account.TaskRegenerationCount);
            if (account.CoinCount < regenerationCost) {
                return Conflict($"You need {regenerationCost} coins to regenerate tasks.");
            }

            var now = DateTime.UtcNow;
            var categoryScores = GetCategoryScores(categoryValues);
            await using var transaction = await _context.Database.BeginTransactionAsync();
            await _context.UserTasks
                .Where(userTask => userTask.UserId == user.Id &&
                                   !userTask.Completed &&
                                   (userTask.Task!.TimeFrame == "Daily" ||
                                    userTask.Task.TimeFrame == "Weekly" ||
                                    userTask.Task.TimeFrame == "Monthly"))
                .ExecuteDeleteAsync();

            await EnsureTasksForPeriodAsync(user.Id, categoryScores, "Daily", 3, now.Date, now, true);
            await EnsureTasksForPeriodAsync(user.Id, categoryScores, "Weekly", 5, StartOfWeek(now.Date), now, true);
            await EnsureTasksForPeriodAsync(
                user.Id,
                categoryScores,
                "Monthly",
                7,
                new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc),
                now,
                true);
            account.CoinCount -= regenerationCost;
            account.TaskRegenerationCount++;
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return Ok(new {
                coins = account.CoinCount,
                regenerationCount = account.TaskRegenerationCount
            });
        }

        private async System.Threading.Tasks.Task EnsureTasksForPeriodAsync(
            string userId,
            IReadOnlyDictionary<string, int> categoryScores,
            string timeFrame,
            int requiredCount,
            DateTime periodStart,
            DateTime assignedAt,
            bool preserveExistingAssignments = false) {
            var currentAssignments = await _context.UserTasks
                .Where(userTask => userTask.UserId == userId &&
                                   userTask.Task!.TimeFrame == timeFrame &&
                                   userTask.AssignedAt >= periodStart)
                .ToListAsync();

            var expiredAssignments = await _context.UserTasks
                .Where(userTask => userTask.UserId == userId &&
                                   userTask.Task!.TimeFrame == timeFrame &&
                                   userTask.AssignedAt < periodStart)
                .ToListAsync();
            if (expiredAssignments.Count > 0) {
                _context.UserTasks.RemoveRange(expiredAssignments);
            }

            if (currentAssignments.Count == requiredCount ||
                (preserveExistingAssignments && currentAssignments.Count > requiredCount)) {
                return;
            }

            if (!preserveExistingAssignments && currentAssignments.Count > 0) {
                _context.UserTasks.RemoveRange(currentAssignments);
                currentAssignments.Clear();
            }

            var tasksToGenerate = requiredCount - (preserveExistingAssignments ? currentAssignments.Count : 0);
            if (tasksToGenerate <= 0) {
                return;
            }

            var existingTaskIds = preserveExistingAssignments
                ? currentAssignments.Select(userTask => userTask.TaskId).ToHashSet()
                : new HashSet<int>();
            var candidates = await _context.Tasks
                .AsNoTracking()
                .Where(task => task.TimeFrame == timeFrame && !existingTaskIds.Contains(task.TaskId))
                .ToListAsync();
            var candidatesByCategory = candidates
                .Select(task => new {
                    Task = task,
                    Category = NormalizeCategory(task.CategoryTag)
                })
                .Where(candidate => candidate.Category != null && categoryScores.ContainsKey(candidate.Category))
                .GroupBy(candidate => candidate.Category!)
                .ToDictionary(
                    group => group.Key,
                    group => group.Select(candidate => candidate.Task).ToList(),
                    StringComparer.OrdinalIgnoreCase);

            var availableCount = candidatesByCategory.Values.Sum(tasks => tasks.Count);
            if (availableCount < tasksToGenerate) {
                throw new InvalidOperationException(
                    $"Only {availableCount} supported {timeFrame.ToLowerInvariant()} tasks are available; {tasksToGenerate} are required.");
            }

            var selectedTasks = new List<(Inner_Tide.Models.Task Task, string Category)>(tasksToGenerate);
            var lowestScore = candidatesByCategory.Keys.Min(category => categoryScores[category]);
            var weakestCategories = candidatesByCategory
                .Where(category => category.Value.Count > 0 && categoryScores[category.Key] == lowestScore)
                .ToList();
            var weakestCategory = weakestCategories[Random.Shared.Next(weakestCategories.Count)];
            var weakestTaskIndex = Random.Shared.Next(weakestCategory.Value.Count);
            selectedTasks.Add((weakestCategory.Value[weakestTaskIndex], weakestCategory.Key));
            weakestCategory.Value.RemoveAt(weakestTaskIndex);

            while (selectedTasks.Count < tasksToGenerate) {
                var availableCategories = candidatesByCategory
                    .Where(category => category.Value.Count > 0)
                    .ToList();
                var totalWeight = availableCategories.Sum(category => Math.Max(1, 101 - categoryScores[category.Key]));
                var selection = Random.Shared.Next(totalWeight);
                var selectedCategory = availableCategories[0];
                foreach (var category in availableCategories) {
                    selection -= Math.Max(1, 101 - categoryScores[category.Key]);
                    if (selection < 0) {
                        selectedCategory = category;
                        break;
                    }
                }

                var taskIndex = Random.Shared.Next(selectedCategory.Value.Count);
                selectedTasks.Add((selectedCategory.Value[taskIndex], selectedCategory.Key));
                selectedCategory.Value.RemoveAt(taskIndex);
            }

            var newAssignments = selectedTasks.Select(selected => {
                var priority = categoryScores[selected.Category] == lowestScore;
                return new UserTask {
                    UserId = userId,
                    TaskId = selected.Task.TaskId,
                    Priority = priority,
                    Multiplier = priority ? 2 : 1,
                    Completed = false,
                    AssignedAt = assignedAt
                };
            });
            _context.UserTasks.AddRange(newAssignments);
            await _context.SaveChangesAsync();
        }

        private static int GetTaskRegenerationCost(int regenerationCount) {
            if (regenerationCount <= 0) {
                return 0;
            }

            return regenerationCount >= 31 ? int.MaxValue : 1 << regenerationCount;
        }

        private static DateTime StartOfWeek(DateTime date) {
            var daysSinceMonday = ((int)date.DayOfWeek + 6) % 7;
            return DateTime.SpecifyKind(date.AddDays(-daysSinceMonday), DateTimeKind.Utc);
        }

        private static IReadOnlyDictionary<string, int> GetCategoryScores(UserCategoryValues values) {
            return new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase) {
                ["Sleep"] = values.Sleep,
                ["Hydration"] = values.Hydration,
                ["Fitness"] = values.Fitness,
                ["Learning"] = values.Learning,
                ["Organization"] = values.Organization,
                ["Mood"] = values.Mood,
                ["Nutrition"] = values.Nutrition,
                ["Social"] = values.Social,
                ["Productivity"] = values.Productivity,
                ["Finance"] = values.Finance,
                ["Exploration"] = values.Exploration,
                ["Habit"] = values.Habit,
                ["Hobby"] = values.Hobby,
                ["Wellness"] = values.Wellness,
                ["Creativity"] = values.Creativity
            };
        }

        private static string? NormalizeCategory(string categoryTag) {
            return categoryTag.Trim().ToLowerInvariant() switch {
                "sleep" => "Sleep",
                "hydration" => "Hydration",
                "fitness" => "Fitness",
                "learning" => "Learning",
                "organization" => "Organization",
                "mood" => "Mood",
                "nutrition" or "Nutrition" => "Nutrition",
                "social" => "Social",
                "productivity" => "Productivity",
                "finance" => "Finance",
                "exploration" => "Exploration",
                "habit" => "Habit",
                "hobby" => "Hobby",
                "wellness" => "Wellness",
                "creativity" => "Creativity",
                _ => null
            };
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error() {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
