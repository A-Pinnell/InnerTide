using Inner_Tide.Data;
using Inner_Tide.Models;
using Inner_Tide.ViewModels;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Inner_Tide.Controllers
{
    public class QuizController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<User> _userManager;

        public QuizController(ApplicationDbContext context, UserManager<User> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        public async Task<IActionResult> Index()
        {
            if (User.Identity?.IsAuthenticated != true)
            {
                return Redirect("/Users/Index");
            }

            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) {
                return Unauthorized();
            }

            var quizProgress = await GetQuizProgressAsync(userId);
            var priorityQuizId = quizProgress
                .FirstOrDefault(quiz => quiz.HasCategoryScore && !quiz.IsCompleted)?
                .Quiz.QuizId;

            return View("Index", new QuizMenuViewModel {
                Quizzes = quizProgress.Select(quiz => new QuizMenuCardViewModel {
                    Quiz = quiz.Quiz,
                    CategoryPercentage = quiz.CategoryPercentage,
                    ProgressPercentage = quiz.ProgressPercentage,
                    QuestionCount = quiz.QuestionCount,
                    IsPriority = priorityQuizId == quiz.Quiz.QuizId,
                    IsCompleted = quiz.IsCompleted
                }).ToList()
            });
        }

        private async Task<List<QuizProgress>> GetQuizProgressAsync(string userId) {
            var quizzes = await _context.Quizzes
                .AsNoTracking()
                .Where(quiz => quiz.QuizTitle != Quiz.SetupQuizTitle)
                .ToListAsync();
            var userCategoryValues = await _context.UserCategoryValues
                .AsNoTracking()
                .SingleOrDefaultAsync(values => values.UserId == userId);
            var categoryScores = userCategoryValues == null
                ? new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
                : GetCategoryScores(userCategoryValues);
            var setupQuizId = await _context.Quizzes
                .AsNoTracking()
                .Where(quiz => quiz.QuizTitle == Quiz.SetupQuizTitle)
                .Select(quiz => (int?)quiz.QuizId)
                .SingleOrDefaultAsync();
            var setupAnsweredQuestionIds = setupQuizId.HasValue
                ? await _context.QuizQuestions
                    .AsNoTracking()
                    .Where(question => question.UserId == userId &&
                        question.QuizId == setupQuizId.Value &&
                        question.AnswerValue > 0)
                    .Select(question => question.QuestionId)
                    .Distinct()
                    .ToListAsync()
                : new List<int>();
            var questions = await _context.Questions
                .AsNoTracking()
                .Select(question => new {
                    question.QuestionId,
                    question.CategoryTag
                })
                .ToListAsync();
            var answeredQuestionIds = await _context.QuizQuestions
                .AsNoTracking()
                .Where(question => question.UserId == userId && question.AnswerValue > 0)
                .Select(question => question.QuestionId)
                .Distinct()
                .ToListAsync();

            return quizzes.Select(quiz => {
                var category = NormalizeQuizCategory(quiz.QuizTitle);
                var quizQuestions = questions
                    .Where(question => NormalizeCategory(question.CategoryTag) == category)
                    .ToList();
                var categoryScore = 0;
                var hasCategoryScore = category != null &&
                    quizQuestions.Count > 0 &&
                    categoryScores.TryGetValue(category, out categoryScore);
                var availableQuestionIds = quizQuestions
                    .Select(question => question.QuestionId)
                    .Distinct()
                    .Where(questionId => !setupAnsweredQuestionIds.Contains(questionId))
                    .ToHashSet();
                var answeredCount = answeredQuestionIds.Count(availableQuestionIds.Contains);

                return new QuizProgress(
                    quiz,
                    hasCategoryScore ? categoryScore : 0,
                    hasCategoryScore,
                    quizQuestions.Count > 0 &&
                        (availableQuestionIds.Count == 0 || answeredCount == availableQuestionIds.Count),
                    availableQuestionIds.Count,
                    quizQuestions.Count == 0
                        ? 0
                        : availableQuestionIds.Count == 0
                        ? 100
                        : (int)Math.Round(
                            answeredCount * 100d / availableQuestionIds.Count,
                            MidpointRounding.AwayFromZero));
            })
            .OrderBy(quiz => quiz.HasCategoryScore ? 0 : 1)
            .ThenBy(quiz => quiz.CategoryPercentage)
            .ThenBy(quiz => quiz.Quiz.QuizId)
            .ToList();
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

        private sealed record QuizProgress(
            Quiz Quiz,
            int CategoryPercentage,
            bool HasCategoryScore,
            bool IsCompleted,
            int QuestionCount,
            int ProgressPercentage);

        private static string? NormalizeCategory(string categoryTag) {
            return categoryTag.Trim().ToLowerInvariant() switch {
                "sleep" => "Sleep",
                "hydration" => "Hydration",
                "fitness" => "Fitness",
                "learning" => "Learning",
                "organization" => "Organization",
                "mood" => "Mood",
                "nutrition" => "Nutrition",
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

        private static string? NormalizeQuizCategory(string quizTitle) {
            const string quizSuffix = " Quiz";
            var category = quizTitle.Trim();
            if (category.EndsWith(quizSuffix, StringComparison.OrdinalIgnoreCase)) {
                category = category[..^quizSuffix.Length];
            }

            return NormalizeCategory(category);
        }

        public async Task<IActionResult> Question(int id)
        {
            if (User.Identity?.IsAuthenticated != true)
            {
                return Redirect("/Users/Index");
            }

            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            if (id <= 0)
            {
                return BadRequest("A valid quiz must be selected.");
            }

            var quiz = await _context.Quizzes
                .AsNoTracking()
                .SingleOrDefaultAsync(quiz => quiz.QuizId == id);
            if (quiz == null) {
                return NotFound("The selected quiz was not found.");
            }

            var category = NormalizeQuizCategory(quiz.QuizTitle);
            if (category == null) {
                return StatusCode(StatusCodes.Status500InternalServerError, "The selected quiz is not assigned to a supported category.");
            }

            var categoryQuestions = await _context.Questions
                .AsNoTracking()
                .OrderBy(question => question.DisplayOrder)
                .ThenBy(question => question.QuestionId)
                .ToListAsync();
            categoryQuestions = categoryQuestions
                .Where(question => NormalizeCategory(question.CategoryTag) == category)
                .ToList();

            if (categoryQuestions.Count == 0) {
                return StatusCode(StatusCodes.Status500InternalServerError, "The selected quiz has no questions configured.");
            }

            var answeredQuestionIds = await _context.QuizQuestions
                .AsNoTracking()
                .Where(quizQuestion => quizQuestion.UserId == user.Id && quizQuestion.AnswerValue > 0)
                .Select(quizQuestion => quizQuestion.QuestionId)
                .Distinct()
                .ToListAsync();
            var unansweredQuizQuestions = categoryQuestions
                .Where(question => !answeredQuestionIds.Contains(question.QuestionId))
                .ToList();
            if (unansweredQuizQuestions.Count == 0) {
                return RedirectToAction(nameof(Index));
            }
            ViewData["QuizReward"] = quiz.CoinRewards;

            var existingUserQuestions = await _context.QuizQuestions
                .AsNoTracking()
                .Where(quizQuestion => quizQuestion.QuizId == id && quizQuestion.UserId == user.Id)
                .Include(quizQuestion => quizQuestion.Question)
                .ToListAsync();
            var existingQuestionsById = existingUserQuestions
                .GroupBy(quizQuestion => quizQuestion.QuestionId)
                .ToDictionary(group => group.Key, group => group.First());
            var userQuizQuestions = new List<QuizQuestion>(unansweredQuizQuestions.Count);
            foreach (var question in unansweredQuizQuestions) {
                if (existingQuestionsById.TryGetValue(question.QuestionId, out var existingQuestion)) {
                    userQuizQuestions.Add(existingQuestion);
                    continue;
                }

                var userQuestion = new QuizQuestion
                {
                    QuizId = id,
                    UserId = user.Id,
                    QuestionId = question.QuestionId,
                    AnswerValue = 0
                };
                _context.QuizQuestions.Add(userQuestion);
            }

            await _context.SaveChangesAsync();
            var unansweredQuestionIds = unansweredQuizQuestions
                .Select(question => question.QuestionId)
                .ToList();
            userQuizQuestions = await _context.QuizQuestions
                .AsNoTracking()
                .Where(quizQuestion => quizQuestion.QuizId == id &&
                    quizQuestion.UserId == user.Id &&
                    unansweredQuestionIds.Contains(quizQuestion.QuestionId))
                .Include(quizQuestion => quizQuestion.Question)
                .ToListAsync();
            userQuizQuestions = userQuizQuestions
                .GroupBy(quizQuestion => quizQuestion.QuestionId)
                .Select(group => group.OrderBy(quizQuestion => quizQuestion.QuizQuestionId).First())
                .ToList();
            var questionOrder = unansweredQuizQuestions
                .Select((question, index) => new { question.QuestionId, index })
                .ToDictionary(item => item.QuestionId, item => item.index);
            userQuizQuestions = userQuizQuestions
                .OrderBy(quizQuestion => questionOrder[quizQuestion.QuestionId])
                .ToList();

            return View("Question", userQuizQuestions);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SaveAnswer([FromForm] int quizQuestionId, [FromForm] int answerValue)
        {
            if (User.Identity?.IsAuthenticated != true)
            {
                return Unauthorized();
            }

            if (answerValue is < 1 or > 5)
            {
                return BadRequest("Answer values must be between 1 and 5.");
            }

            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            var quizQuestion = await _context.QuizQuestions
                .SingleOrDefaultAsync(question => question.QuizQuestionId == quizQuestionId && question.UserId == user.Id);
            if (quizQuestion == null)
            {
                return NotFound("The quiz question was not found for the current user.");
            }

            var quiz = await _context.Quizzes
                .AsNoTracking()
                .SingleOrDefaultAsync(candidate => candidate.QuizId == quizQuestion.QuizId);
            if (quiz?.QuizTitle == Quiz.SetupQuizTitle) {
                quizQuestion.AnswerValue = answerValue;
                await _context.SaveChangesAsync();
                return Json(new { completed = false, reward = 0, coins = user.CoinCount });
            }

            var category = quiz == null ? null : NormalizeQuizCategory(quiz.QuizTitle);
            if (quiz == null || category == null) {
                return StatusCode(StatusCodes.Status500InternalServerError, "The selected quiz is not assigned to a supported category.");
            }

            var categoryQuestionIds = (await _context.Questions
                .AsNoTracking()
                .Select(question => new {
                    question.QuestionId,
                    question.CategoryTag
                })
                .ToListAsync())
                .Where(question => NormalizeCategory(question.CategoryTag) == category)
                .Select(question => question.QuestionId)
                .Distinct()
                .ToList();
            var setupQuizId = await _context.Quizzes
                .AsNoTracking()
                .Where(candidate => candidate.QuizTitle == Quiz.SetupQuizTitle)
                .Select(candidate => (int?)candidate.QuizId)
                .SingleOrDefaultAsync();
            var setupAnsweredQuestionIds = setupQuizId.HasValue
                ? await _context.QuizQuestions
                    .AsNoTracking()
                    .Where(question => question.UserId == user.Id &&
                        question.QuizId == setupQuizId.Value &&
                        question.AnswerValue > 0)
                    .Select(question => question.QuestionId)
                    .Distinct()
                    .ToListAsync()
                : new List<int>();
            var availableCategoryQuestionIds = categoryQuestionIds
                .Where(questionId => !setupAnsweredQuestionIds.Contains(questionId))
                .ToList();
            var alreadyAnsweredCategoryQuestionIds = await _context.QuizQuestions
                .AsNoTracking()
                .Where(question => question.UserId == user.Id &&
                    question.AnswerValue > 0 &&
                    availableCategoryQuestionIds.Contains(question.QuestionId))
                .Select(question => question.QuestionId)
                .Distinct()
                .ToListAsync();
            if (availableCategoryQuestionIds.Count == 0 ||
                availableCategoryQuestionIds.All(alreadyAnsweredCategoryQuestionIds.Contains)) {
                return Conflict("This quiz has already been completed.");
            }

            var priorityQuizId = (await GetQuizProgressAsync(user.Id))
                .FirstOrDefault(candidate => candidate.HasCategoryScore && !candidate.IsCompleted)?
                .Quiz.QuizId;
            var isPriorityQuiz = priorityQuizId == quiz.QuizId;
            quizQuestion.AnswerValue = answerValue;
            await _context.SaveChangesAsync();

            var answeredCategoryQuestionIds = await _context.QuizQuestions
                .AsNoTracking()
                .Where(question => question.UserId == user.Id &&
                    question.AnswerValue > 0 &&
                    availableCategoryQuestionIds.Contains(question.QuestionId))
                .Select(question => question.QuestionId)
                .Distinct()
                .ToListAsync();
            if (availableCategoryQuestionIds.All(answeredCategoryQuestionIds.Contains)) {
                var previousPercentage = await UpdateCategoryScoreAsync(user.Id, category, categoryQuestionIds);
                if (previousPercentage.HasValue) {
                    TempData["InnerTideChangedCategory"] = category;
                    TempData["InnerTidePreviousCategoryPercentage"] = previousPercentage.Value;
                }

                var reward = quiz.CoinRewards * (isPriorityQuiz ? 2 : 1);
                user.CoinCount += reward;
                await _context.SaveChangesAsync();
                return Json(new {
                    completed = true,
                    reward,
                    coins = user.CoinCount
                });
            }

            return Json(new { completed = false, reward = 0, coins = user.CoinCount });
        }

        private async System.Threading.Tasks.Task<int?> UpdateCategoryScoreAsync(
            string userId,
            string category,
            IReadOnlyCollection<int> categoryQuestionIds) {
            var questionAnswers = await _context.QuizQuestions
                .AsNoTracking()
                .Where(question => question.UserId == userId &&
                    question.AnswerValue > 0 &&
                    categoryQuestionIds.Contains(question.QuestionId))
                .Select(question => new {
                    question.QuestionId,
                    question.AnswerValue
                })
                .ToListAsync();
            var answers = questionAnswers
                .GroupBy(answer => answer.QuestionId)
                .Select(group => group.Average(answer => answer.AnswerValue))
                .ToList();
            if (answers.Count == 0) {
                return null;
            }

            var values = await _context.UserCategoryValues
                .SingleOrDefaultAsync(categoryValues => categoryValues.UserId == userId);
            if (values == null) {
                values = new UserCategoryValues { UserId = userId };
                _context.UserCategoryValues.Add(values);
            }

            var previousPercentage = GetCategoryPercentage(values, category);
            var percentage = (int)Math.Round(
                answers.Sum(answer => answer) * 100d / (5 * answers.Count),
                MidpointRounding.AwayFromZero);
            switch (category) {
                case "Sleep": values.Sleep = percentage; break;
                case "Hydration": values.Hydration = percentage; break;
                case "Fitness": values.Fitness = percentage; break;
                case "Learning": values.Learning = percentage; break;
                case "Organization": values.Organization = percentage; break;
                case "Mood": values.Mood = percentage; break;
                case "Nutrition": values.Nutrition = percentage; break;
                case "Social": values.Social = percentage; break;
                case "Productivity": values.Productivity = percentage; break;
                case "Finance": values.Finance = percentage; break;
                case "Exploration": values.Exploration = percentage; break;
                case "Habit": values.Habit = percentage; break;
                case "Hobby": values.Hobby = percentage; break;
                case "Wellness": values.Wellness = percentage; break;
                case "Creativity": values.Creativity = percentage; break;
                default: return null;
            }

            await _context.SaveChangesAsync();
            return previousPercentage;
        }

        private static int GetCategoryPercentage(UserCategoryValues values, string category) {
            return category switch {
                "Sleep" => values.Sleep,
                "Hydration" => values.Hydration,
                "Fitness" => values.Fitness,
                "Learning" => values.Learning,
                "Organization" => values.Organization,
                "Mood" => values.Mood,
                "Nutrition" => values.Nutrition,
                "Social" => values.Social,
                "Productivity" => values.Productivity,
                "Finance" => values.Finance,
                "Exploration" => values.Exploration,
                "Habit" => values.Habit,
                "Hobby" => values.Hobby,
                "Wellness" => values.Wellness,
                "Creativity" => values.Creativity,
                _ => 0
            };
        }
    }
}
