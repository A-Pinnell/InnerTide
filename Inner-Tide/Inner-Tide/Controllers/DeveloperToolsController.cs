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

        [HttpGet]
        public async Task<IActionResult> GetAquariumFish() {
            if (!IsDeveloperEnvironment()) {
                return NotFound();
            }

            var user = await _userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            var aquariums = await _context.Aquariums
                .Where(aquarium => aquarium.UserId == user.Id)
                .OrderBy(aquarium => aquarium.AquariumId)
                .Select(aquarium => new { aquarium.AquariumId })
                .ToListAsync();
            var aquariumNumbers = aquariums
                .Select((aquarium, index) => new { aquarium.AquariumId, AquariumNumber = index + 1 })
                .ToDictionary(aquarium => aquarium.AquariumId, aquarium => aquarium.AquariumNumber);
            var placedFish = await _context.UserFish
                .Where(fish => fish.UserId == user.Id && fish.IsInAquarium && fish.AquariumId != null)
                .Select(fish => new { fish.UserFishId, fish.FishId, AquariumId = fish.AquariumId!.Value })
                .ToListAsync();

            if (placedFish.Count == 0) {
                return Json(Array.Empty<object>());
            }

            using var response = await _httpClient.GetAsync("https://innertideapi.vercel.app/api/v1/fish");
            if (!response.IsSuccessStatusCode) {
                return Problem(
                    detail: "Unable to load the fish catalog to display aquarium fish.",
                    statusCode: StatusCodes.Status502BadGateway);
            }

            var catalog = await response.Content.ReadFromJsonAsync<List<Fish>>();
            if (catalog == null) {
                return Problem(
                    detail: "The fish catalog returned no data.",
                    statusCode: StatusCodes.Status502BadGateway);
            }

            var catalogById = catalog.ToDictionary(fish => fish.FishId, StringComparer.Ordinal);
            var result = placedFish.Select(fish => {
                catalogById.TryGetValue(fish.FishId, out var details);
                aquariumNumbers.TryGetValue(fish.AquariumId, out var aquariumNumber);
                return new {
                    fish.UserFishId,
                    fish.FishId,
                    aquariumNumber,
                    species = details?.Species ?? fish.FishId,
                    sprite = details?.Sprite
                };
            });

            return Json(result);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ClearAquariumFish() {
            if (!IsDeveloperEnvironment()) {
                return NotFound();
            }

            var user = await _userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            var aquariums = await _context.Aquariums
                .Where(aquarium => aquarium.UserId == user.Id)
                .ToListAsync();
            var placedFish = await _context.UserFish
                .Where(fish => fish.UserId == user.Id && fish.IsInAquarium)
                .ToListAsync();

            foreach (var fish in placedFish) {
                fish.IsInAquarium = false;
                fish.AquariumId = null;
            }

            foreach (var aquarium in aquariums) {
                aquarium.CurrentFish = 0;
                aquarium.CompletionPercentage = 0;
            }

            await _context.SaveChangesAsync();
            return Ok(new { removed = placedFish.Count });
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
