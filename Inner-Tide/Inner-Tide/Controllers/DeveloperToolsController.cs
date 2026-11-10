using Inner_Tide.Data;
using Inner_Tide.Models;
using Inner_Tide.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Inner_Tide.Controllers {
    [Authorize]
    public class DeveloperToolsController : Controller {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<User> _userManager;
        private readonly HttpClient _httpClient;
        private readonly IWebHostEnvironment _environment;
        private readonly AquariumProgressLimitSettings _progressLimitSettings;

        public DeveloperToolsController(
            ApplicationDbContext context,
            UserManager<User> userManager,
            HttpClient httpClient,
            IWebHostEnvironment environment,
            AquariumProgressLimitSettings progressLimitSettings) {
            _context = context;
            _userManager = userManager;
            _httpClient = httpClient;
            _environment = environment;
            _progressLimitSettings = progressLimitSettings;
        }

        [HttpGet]
        public IActionResult GetAquariumProgressLimit() {
            var available = IsDeveloperEnvironment();
            return Json(new {
                available,
                disabled = available && _progressLimitSettings.IsDisabled
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetLevelProgress() {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            return Json(new {
                level = user.AccountLevel,
                currentXP = user.CurrentXP,
                experienceForNextLevel = user.XPForNextLevel,
                experienceRemaining = Math.Max(0, user.XPForNextLevel - user.CurrentXP),
                isMaxLevel = user.AccountLevel >= 99
            });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult SetAquariumProgressLimit([FromBody] SetAquariumProgressLimitRequest request) {
            if (!IsDeveloperEnvironment()) {
                return NotFound();
            }

            if (request == null || !ModelState.IsValid || request.Disabled == null) {
                return BadRequest("Provide whether aquarium progress limits should be disabled.");
            }

            _progressLimitSettings.IsDisabled = request.Disabled.Value;
            return Ok(new { disabled = _progressLimitSettings.IsDisabled });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ResetTasks() {
            if (!IsDeveloperEnvironment()) {
                return NotFound();
            }

            var user = await _userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            var userTasks = await _context.UserTasks
                .Where(ut => ut.UserId == user.Id && ut.Completed)
                .ToListAsync();

            foreach (var userTask in userTasks) {
                userTask.Completed = false;
            }

            await _context.SaveChangesAsync();

            return Ok(new { reset = true });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ResetAdditionalQuizQuestions() {
            if (!IsDeveloperEnvironment()) {
                return NotFound();
            }

            var user = await _userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            var setupQuizId = await _context.Quizzes
                .Where(quiz => quiz.QuizTitle == Quiz.SetupQuizTitle)
                .Select(quiz => (int?)quiz.QuizId)
                .SingleOrDefaultAsync();
            if (!setupQuizId.HasValue) {
                return Conflict("The setup quiz is not configured.");
            }

            var additionalQuizQuestions = await _context.QuizQuestions
                .Where(question => question.UserId == user.Id && question.QuizId != setupQuizId.Value)
                .ToListAsync();
            var setupAnswers = await _context.QuizQuestions
                .AsNoTracking()
                .Where(question => question.UserId == user.Id &&
                    question.QuizId == setupQuizId.Value &&
                    question.AnswerValue > 0)
                .Include(question => question.Question)
                .ToListAsync();
            var categoryValues = await _context.UserCategoryValues
                .SingleOrDefaultAsync(values => values.UserId == user.Id);
            if (categoryValues == null) {
                categoryValues = new UserCategoryValues { UserId = user.Id };
                _context.UserCategoryValues.Add(categoryValues);
            }

            var categories = new[] {
                "Sleep", "Hydration", "Fitness", "Learning", "Organization",
                "Mood", "Nutrition", "Social", "Productivity", "Finance",
                "Exploration", "Habit", "Hobby", "Wellness", "Creativity"
            };
            foreach (var category in categories) {
                var answers = setupAnswers
                    .Where(answer => answer.Question != null &&
                        string.Equals(answer.Question.CategoryTag.Trim(), category, StringComparison.OrdinalIgnoreCase))
                    .ToList();
                var percentage = answers.Count == 0
                    ? 0
                    : (int)Math.Round(
                        answers.Sum(answer => answer.AnswerValue) * 100d / (5 * answers.Count),
                        MidpointRounding.AwayFromZero);
                SetCategoryPercentage(categoryValues, category, percentage);
            }

            _context.QuizQuestions.RemoveRange(additionalQuizQuestions);
            await _context.SaveChangesAsync();
            return Ok(new { removed = additionalQuizQuestions.Count });
        }

        private static void SetCategoryPercentage(UserCategoryValues values, string category, int percentage) {
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
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SetCoins([FromBody] SetCoinsRequest request) {
            if (!IsDeveloperEnvironment()) {
                return NotFound();
            }

            if (request == null || !ModelState.IsValid) {
                return ValidationProblem(ModelState);
            }

            var user = await _userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            user.CoinCount = request.Amount;
            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded) {
                return BadRequest(new { errors = result.Errors.Select(error => error.Description) });
            }

            return Ok(new { coins = user.CoinCount });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SetFish([FromBody] SetInventoryRequest request) {
            if (!IsDeveloperEnvironment()) {
                return NotFound();
            }

            if (!ModelState.IsValid || request.Ids == null || request.Ids.Count > 100) {
                return BadRequest("Provide up to 100 fish IDs.");
            }

            var catalog = await _httpClient.GetFromJsonAsync<List<Fish>>("https://innertideapi.vercel.app/api/v1/fish")
                ?? throw new InvalidOperationException("The fish catalog returned no data.");
            var requestedIds = request.Ids.ToHashSet(StringComparer.Ordinal);
            if (requestedIds.Any(id => !catalog.Any(fish => fish.FishId == id))) {
                return BadRequest("One or more fish IDs are not in the catalog.");
            }

            var user = await _userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            var existingFish = await _context.UserFish
                .Where(userFish => userFish.UserId == user.Id)
                .ToListAsync();
            _context.UserFish.RemoveRange(existingFish.Where(userFish => !requestedIds.Contains(userFish.FishId)));

            var ownedFishIds = existingFish.Select(userFish => userFish.FishId).ToHashSet(StringComparer.Ordinal);
            foreach (var fishId in requestedIds.Where(id => !ownedFishIds.Contains(id))) {
                _context.UserFish.Add(new UserFish {
                    UserId = user.Id,
                    FishId = fishId,
                    IsInAquarium = false
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { fish = requestedIds.Count });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SetItems([FromBody] SetInventoryRequest request) {
            if (!IsDeveloperEnvironment()) {
                return NotFound();
            }

            if (!ModelState.IsValid || request.Ids == null || request.Ids.Count > 100) {
                return BadRequest("Provide up to 100 item IDs.");
            }

            var catalog = await _httpClient.GetFromJsonAsync<List<Item>>("https://innertideapi.vercel.app/api/v1/item")
                ?? throw new InvalidOperationException("The object catalog returned no data.");
            var requestedIds = request.Ids.ToHashSet(StringComparer.Ordinal);
            if (requestedIds.Any(id => !catalog.Any(item => item.ItemId == id))) {
                return BadRequest("One or more object IDs are not in the catalog.");
            }

            var user = await _userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            var existingItems = await _context.UserItems
                .Where(userItem => userItem.UserId == user.Id)
                .ToListAsync();
            _context.UserItems.RemoveRange(existingItems.Where(userItem => !requestedIds.Contains(userItem.ItemId)));

            var ownedItemIds = existingItems.Select(userItem => userItem.ItemId).ToHashSet(StringComparer.Ordinal);
            foreach (var itemId in requestedIds.Where(id => !ownedItemIds.Contains(id))) {
                _context.UserItems.Add(new UserItem {
                    UserId = user.Id,
                    ItemId = itemId,
                    IsInAquarium = false
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { items = requestedIds.Count });
        }

        [HttpGet]
        public async Task<IActionResult> GetPelletInventory() {
            if (!IsDeveloperEnvironment()) {
                return NotFound();
            }

            var user = await _userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            return Json(new { small = user.SmallPelletCount, large = user.LargePelletCount });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SetPelletInventory([FromBody] SetPelletInventoryRequest request) {
            if (!IsDeveloperEnvironment()) {
                return NotFound();
            }

            if (request == null || !ModelState.IsValid) {
                return ValidationProblem(ModelState);
            }

            var user = await _userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            user.SmallPelletCount = request.Small;
            user.LargePelletCount = request.Large;
            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded) {
                return BadRequest(new { errors = result.Errors.Select(error => error.Description) });
            }

            return Ok(new { small = user.SmallPelletCount, large = user.LargePelletCount });
        }

        [HttpGet]
        public async Task<IActionResult> GetDeveloperAquariums() {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            var aquariums = await _context.Aquariums
                .Where(aquarium => aquarium.UserId == user.Id)
                .OrderBy(aquarium => aquarium.AquariumId)
                .Select(aquarium => new { aquarium.AquariumId })
                .ToListAsync();

            return Json(aquariums.Select((aquarium, index) => new {
                aquarium.AquariumId,
                aquariumNumber = index + 1
            }));
        }

        [HttpGet]
        public async Task<IActionResult> GetAquariumItems(int aquariumId) {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            var aquarium = await _context.Aquariums
                .FirstOrDefaultAsync(item => item.UserId == user.Id && item.AquariumId == aquariumId);
            if (aquarium == null) {
                return NotFound("Aquarium was not found.");
            }

            var placedFish = await _context.UserFish
                .Where(fish => fish.UserId == user.Id && fish.IsInAquarium && fish.AquariumId == aquariumId)
                .Select(fish => new { fish.UserFishId, fish.FishId })
                .ToListAsync();
            var placedObjects = await _context.UserItems
                .Where(item => item.UserId == user.Id && item.IsInAquarium && item.AquariumId == aquariumId)
                .Select(item => new { item.UserItemId, item.ItemId })
                .ToListAsync();

            var fishEntries = new List<object>();
            if (placedFish.Count > 0) {
                var catalog = await _httpClient.GetFromJsonAsync<List<Fish>>("https://innertideapi.vercel.app/api/v1/fish")
                    ?? throw new InvalidOperationException("The fish catalog returned no data.");
                var catalogById = catalog.ToDictionary(fish => fish.FishId, StringComparer.Ordinal);
                fishEntries = placedFish.Select(fish => {
                    catalogById.TryGetValue(fish.FishId, out var details);
                    return (object)new {
                        fish.UserFishId,
                        fish.FishId,
                        species = details?.Species ?? fish.FishId,
                        sprite = details?.Sprite
                    };
                }).ToList();
            }

            var objectEntries = new List<object>();
            if (placedObjects.Count > 0) {
                var catalog = await _httpClient.GetFromJsonAsync<List<Item>>("https://innertideapi.vercel.app/api/v1/item")
                    ?? throw new InvalidOperationException("The object catalog returned no data.");
                var catalogById = catalog.ToDictionary(item => item.ItemId, StringComparer.Ordinal);
                objectEntries = placedObjects.Select(placedItem => {
                    catalogById.TryGetValue(placedItem.ItemId, out var details);
                    return (object)new {
                        placedItem.UserItemId,
                        placedItem.ItemId,
                        name = details?.Name ?? placedItem.ItemId,
                        sprite = details?.Sprite
                    };
                }).ToList();
            }

            return Json(new { fish = fishEntries, objects = objectEntries });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ClearAquariumItems([FromBody] ClearAquariumItemsRequest request) {
            if (request == null || !ModelState.IsValid ||
                request.Category is not ("fish" or "objects" or "all")) {
                return BadRequest("Choose fish, objects, or all aquarium items.");
            }

            var user = await _userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            var aquarium = await _context.Aquariums
                .FirstOrDefaultAsync(item => item.UserId == user.Id && item.AquariumId == request.AquariumId);
            if (aquarium == null) {
                return NotFound("Aquarium was not found.");
            }

            var removedFish = 0;
            if (request.Category is "fish" or "all") {
                var fish = await _context.UserFish
                    .Where(item => item.UserId == user.Id && item.AquariumId == aquarium.AquariumId && item.IsInAquarium)
                    .ToListAsync();
                foreach (var entry in fish) {
                    entry.IsInAquarium = false;
                    entry.AquariumId = null;
                    entry.xCord = 0;
                    entry.yCord = 0;
                }

                if (fish.Any(entry => aquarium.FirstPlacedUserFishId == entry.UserFishId)) {
                    aquarium.FirstPlacedUserFishId = null;
                }
                removedFish = fish.Count;
            }

            var removedObjects = 0;
            if (request.Category is "objects" or "all") {
                var objects = await _context.UserItems
                    .Where(item => item.UserId == user.Id && item.AquariumId == aquarium.AquariumId && item.IsInAquarium)
                    .ToListAsync();
                var objectIds = objects.Select(item => item.UserItemId).ToHashSet();
                var gridCells = await _context.AquariumItemGridCells
                    .Where(cell => cell.AquariumId == aquarium.AquariumId && objectIds.Contains(cell.UserItemId))
                    .ToListAsync();
                _context.AquariumItemGridCells.RemoveRange(gridCells);
                foreach (var entry in objects) {
                    entry.IsInAquarium = false;
                    entry.AquariumId = null;
                    entry.GridX = null;
                    entry.GridY = null;
                    entry.SandLayer = null;
                    entry.isFloating = false;
                }
                removedObjects = objects.Count;
            }

            aquarium.CurrentFish = Math.Max(0, await _context.UserFish
                .CountAsync(item => item.UserId == user.Id && item.AquariumId == aquarium.AquariumId && item.IsInAquarium) - removedFish);
            aquarium.CurrentObjects = Math.Max(0, await _context.UserItems
                .CountAsync(item => item.UserId == user.Id && item.AquariumId == aquarium.AquariumId && item.IsInAquarium) - removedObjects);
            aquarium.CompletionPercentage = aquarium.MaxFish <= 0
                ? 0
                : Math.Clamp((int)Math.Round(aquarium.CurrentFish * 100d / aquarium.MaxFish), 0, 100);

            await _context.SaveChangesAsync();
            return Ok(new { removedFish, removedObjects });
        }

        private bool IsDeveloperEnvironment() => _environment.IsDevelopment();
    }

    public class SetCoinsRequest {
        [Range(0, 999)]
        public int Amount { get; set; }
    }

    public class SetInventoryRequest {
        [Required]
        public List<string>? Ids { get; set; }
    }

    public class SetAquariumProgressLimitRequest {
        [Required]
        public bool? Disabled { get; set; }
    }

    public class SetPelletInventoryRequest {
        [Range(0, 999)]
        public int Small { get; set; }

        [Range(0, 999)]
        public int Large { get; set; }
    }

    public class ClearAquariumItemsRequest {
        [Range(1, int.MaxValue)]
        public int AquariumId { get; set; }

        [Required]
        public string Category { get; set; } = string.Empty;
    }
}
