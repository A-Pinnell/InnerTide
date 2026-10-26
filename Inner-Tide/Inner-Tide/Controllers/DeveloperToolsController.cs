using Inner_Tide.Data;
using Inner_Tide.Models;
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

        public DeveloperToolsController(
            ApplicationDbContext context,
            UserManager<User> userManager,
            HttpClient httpClient,
            IWebHostEnvironment environment) {
            _context = context;
            _userManager = userManager;
            _httpClient = httpClient;
            _environment = environment;
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

            var assignments = await _context.UserTasks
                .Where(userTask => userTask.UserId == user.Id)
                .Include(userTask => userTask.Task)
                .ToListAsync();
            var taskIds = assignments
                .Where(assignment => assignment.Task != null)
                .Select(assignment => assignment.TaskId)
                .Distinct()
                .ToList();
            var sharedTaskIds = await _context.UserTasks
                .Where(userTask => taskIds.Contains(userTask.TaskId) && userTask.UserId != user.Id)
                .Select(userTask => userTask.TaskId)
                .Distinct()
                .ToHashSetAsync();

            foreach (var assignment in assignments) {
                if (assignment.Task == null || !assignment.Task.Completed) {
                    continue;
                }

                if (sharedTaskIds.Contains(assignment.TaskId)) {
                    var task = assignment.Task;
                    var resetTask = new Inner_Tide.Models.Task {
                        Title = task.Title,
                        TimeFrame = task.TimeFrame,
                        CoinReward = task.CoinReward,
                        Multiplier = task.Multiplier,
                        Priority = task.Priority,
                        Completed = false,
                        CategoryTag = task.CategoryTag
                    };
                    _context.Tasks.Add(resetTask);
                    assignment.Task = resetTask;
                } else {
                    assignment.Task.Completed = false;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { reset = true });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SetCoins([FromBody] SetCoinsRequest request) {
            if (!IsDeveloperEnvironment()) {
                return NotFound();
            }

            if (!ModelState.IsValid) {
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
}
