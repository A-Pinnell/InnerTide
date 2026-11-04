using Inner_Tide.Data;
using Inner_Tide.Models;
using Inner_Tide.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using System.Threading.Channels;

namespace Inner_Tide.Controllers {
    public class AquariumController : Controller {
        private const int AquariumObjectGridColumns = 28;
        private const int AquariumObjectGridRows = 4;

        private readonly SignInManager<User> signInManager;
        private readonly UserManager<User> userManager;
        private readonly HttpClient _httpClient;
        private readonly ILogger<AquariumController> _logger;
        private readonly AquariumProgressLimitSettings _progressLimitSettings;

        // Shared db connection obj
        ApplicationDbContext _context;

        public AquariumController(ApplicationDbContext context, SignInManager<User> signInManager, 
                                    UserManager<User> userManager, HttpClient httpClient, ILogger<AquariumController> logger,
                                    AquariumProgressLimitSettings progressLimitSettings) {
            this.signInManager = signInManager;
            this.userManager = userManager;
            _httpClient = httpClient;
            _logger = logger;
            _progressLimitSettings = progressLimitSettings;
            _context = context;
        }
        public async Task<IActionResult> Index(int aquarium = 1) {
            if (User.Identity?.IsAuthenticated != true)
            {
                return Redirect("/Users/Index");
            }

            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            if (aquarium < 1) {
                return NotFound();
            }

            var aquariums = await GetOrCreateAquariumsAsync(user.Id);
            if (aquarium > aquariums.Count) {
                return NotFound();
            }

            var selectedAquarium = aquariums[aquarium - 1];
            var backgroundNumber = aquarium <= 5 ? aquarium : ((aquarium - 6) % 5) + 1;
            ViewData["AccountId"] = user.Id;
            ViewData["AquariumNumber"] = aquarium;
            ViewData["AquariumId"] = selectedAquarium.AquariumId;
            ViewData["AquariumBackgroundNumber"] = backgroundNumber;
            return View("Index");
        }

        [HttpGet]
        public async Task<IActionResult> GetAquariums() {
            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            var aquariums = await GetOrCreateAquariumsAsync(user.Id);
            return Json(aquariums.Select((aquarium, index) => new {
                aquariumNumber = index + 1,
                aquarium.AquariumId,
                completionPercentage = GetAquariumCompletionPercentage(aquarium)
            }));
        }

        private async Task<List<Aquarium>> GetOrCreateAquariumsAsync(string userId) {
            var aquariums = await _context.Aquariums
                .Where(aquarium => aquarium.UserId == userId)
                .OrderBy(aquarium => aquarium.AquariumId)
                .ToListAsync();

            if (aquariums.Count == 0) {
                var firstAquarium = new Aquarium {
                    MaxFish = 10,
                    MaxObjects = 5,
                    CurrentFish = 0,
                    CurrentObjects = 0,
                    CompletionPercentage = 0,
                    UserId = userId
                };
                _context.Aquariums.Add(firstAquarium);
                await _context.SaveChangesAsync();
                aquariums.Add(firstAquarium);
            }

            return aquariums;
        }

        private static int GetAquariumCompletionPercentage(Aquarium aquarium) {
            if (aquarium.MaxFish <= 0) {
                return 0;
            }

            return Math.Clamp((int)Math.Round(aquarium.CurrentFish * 100d / aquarium.MaxFish), 0, 100);
        }

        public async Task<IActionResult> GetAllFish() {
            try {
                var res = await _httpClient.GetAsync("https://innertideapi.vercel.app/api/v1/fish");

                if (!res.IsSuccessStatusCode) {
                    return StatusCode((int)res.StatusCode);
                }

                var json = await res.Content.ReadAsStringAsync();

                var fishList = JsonSerializer.Deserialize<List<Fish>>(
                    json,
                    new JsonSerializerOptions {
                        PropertyNameCaseInsensitive = true
                    });

                return Json(fishList);
            } catch (Exception ex) {
                return StatusCode(500, ex.Message);
            }
        }

        public async Task<IActionResult> GetUserFish() {
            try {
                var user = await userManager.GetUserAsync(User);

                if (user == null) {
                    return NotFound();
                }

                var userFish = await _context.UserFish.Where(uf => uf.UserId == user.Id && uf.IsInAquarium == false)
                                        .Select(uf => new {
                                            uf.UserFishId,
                                            uf.FishId,
                                            uf.AcquiredAt
                                        }).ToListAsync();

                var fishList = new List<object>();

                foreach (var fish in userFish) {
                    var res = await _httpClient.GetFromJsonAsync<Fish>("https://innertideapi.vercel.app/api/v1/fish/" + fish.FishId);

                    if (res != null) {
                        fishList.Add(new {
                            userFishId = fish.UserFishId,
                            fishId = res.FishId,
                            acquiredAt = fish.AcquiredAt,
                            res.Sprite,
                            res.Species,
                            res.Description,
                            res.Price,
                            res.Height,
                            res.Width,
                            res.FunFacts
                        });
                    }
                }//end foreach

                return Json(fishList);

            } catch (Exception ex) {
                _logger.LogError(ex, "Could not load fish from the user's inventory.");
                return StatusCode(500, ex.GetBaseException().Message);
            }
        }

        public async Task<IActionResult> GetAllItems() {
            try {
                var res = await _httpClient.GetAsync("https://innertideapi.vercel.app/api/v1/item");

                if (!res.IsSuccessStatusCode) {
                    return StatusCode((int)res.StatusCode);
                }

                var json = await res.Content.ReadAsStringAsync();

                var itemList = JsonSerializer.Deserialize<List<Item>>(
                    json,
                    new JsonSerializerOptions {
                        PropertyNameCaseInsensitive = true
                    });

                return Json(itemList);
            } catch (Exception ex) {
                return StatusCode(500, ex.Message);
            }
        }

        public async Task<IActionResult> GetUserItems() {
            try {
                var user = await userManager.GetUserAsync(User);

                if (user == null) {
                    return NotFound();
                }

                var userItems = await _context.UserItems
                    .Where(ui => ui.UserId == user.Id && !ui.IsInAquarium)
                    .Select(ui => new {
                        ui.UserItemId,
                        ui.ItemId
                    })
                    .ToListAsync();

                var itemList = new List<object>();

                foreach (var item in userItems) {
                    var res = await _httpClient.GetFromJsonAsync<Item>("https://innertideapi.vercel.app/api/v1/item/" + item.ItemId);

                    if (res != null) {
                        itemList.Add(new {
                            userItemId = item.UserItemId,
                            itemId = res.ItemId,
                            res.Sprite,
                            res.Name,
                            res.Description,
                            res.Price,
                            res.GridSpace
                        });
                    }
                }//end foreach

                return Json(itemList);

            } catch (Exception ex) {
                _logger.LogError(ex, "Could not load items from the user's inventory.");
                return StatusCode(500, ex.GetBaseException().Message);
            }
        }

        [HttpPost]
        public async Task<IActionResult> PurchaseShopFish(string fishId, int xCord, int yCord) {
            if (string.IsNullOrWhiteSpace(fishId)) {
                return BadRequest("A fish ID is required.");
            }

            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized("Sign in before purchasing fish.");
            }

            Fish? fish;
            try {
                using var response = await _httpClient.GetAsync(
                    $"https://innertideapi.vercel.app/api/v1/fish/{Uri.EscapeDataString(fishId)}");
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound) {
                    return NotFound("This fish is no longer available.");
                }

                if (!response.IsSuccessStatusCode) {
                    _logger.LogWarning("Fish catalog returned HTTP {StatusCode} while loading fish {FishId}.", response.StatusCode, fishId);
                    return Problem(
                        detail: "The fish catalog is temporarily unavailable. Please try again.",
                        statusCode: StatusCodes.Status502BadGateway);
                }

                fish = await response.Content.ReadFromJsonAsync<Fish>();
            } catch (HttpRequestException ex) {
                _logger.LogError(ex, "Unable to contact fish catalog while loading fish {FishId}.", fishId);
                return Problem(
                    detail: "The fish catalog is temporarily unavailable. Please try again.",
                    statusCode: StatusCodes.Status502BadGateway);
            } catch (JsonException ex) {
                _logger.LogError(ex, "Fish catalog returned invalid data for fish {FishId}.", fishId);
                return Problem(
                    detail: "The fish catalog returned invalid data. Please try again later.",
                    statusCode: StatusCodes.Status502BadGateway);
            }

            if (fish == null) {
                return NotFound("This fish is no longer available.");
            }

            if (user.CoinCount < fish.Price) {
                return BadRequest("You do not have enough coins to buy this fish.");
            }

            var userFish = new UserFish {
                UserId = user.Id,
                FishId = fish.FishId,
                IsInAquarium = false,
                AcquiredAt = DateTime.UtcNow,
                xCord = xCord,
                yCord = yCord
            };

            _context.UserFish.Add(userFish);
            user.CoinCount -= fish.Price;

            try {
                await _context.SaveChangesAsync();
            } catch (DbUpdateException ex) {
                _logger.LogError(ex, "Unable to save fish purchase for user {UserId} and fish {FishId}.", user.Id, fishId);
                return Problem(
                    detail: "The fish purchase could not be saved. Please try again.",
                    statusCode: StatusCodes.Status500InternalServerError);
            }

            return Ok(new {
                success = true,
                userFishId = userFish.UserFishId,
                fishId = fish.FishId,
                fishSpecies = fish.Species,
                coinsSpent = fish.Price,
                remainingCoins = user.CoinCount
            });
        }

        [HttpPost]
        public async Task<IActionResult> PurchaseShopItem(string itemId) {
            try {
                var user = await userManager.GetUserAsync(User);

                if (user == null) {
                    return NotFound();
                }

                var item = await _httpClient.GetFromJsonAsync<Item>("https://innertideapi.vercel.app/api/v1/item/" + itemId);

                if (item == null) {
                    return NotFound("Item not Found");
                }

                var itemPrice = item.Price;

                if (user.CoinCount >= itemPrice) {
                    var userItem = new UserItem {
                        UserId = user.Id,
                        ItemId = itemId,
                        IsInAquarium = false,
                    };

                    _context.UserItems.Add(userItem);

                    user.CoinCount -= itemPrice;

                    await _context.SaveChangesAsync();

                    return Ok(new {
                        success = true,
                        itemId = item.ItemId,
                        itemName = item.Name,
                        coinsSpent = itemPrice,
                        remainingCoins = user.CoinCount
                    });
                }

                return NotFound();
            } catch (Exception ex) {
                _logger.LogError(ex, "Could not purchase the aquarium item.");
                return StatusCode(500, ex.GetBaseException().Message);
            }
        }

        //[HttpGet]
        //public async Task<IActionResult> GetAllUserAquariums() {
        //    var user = await userManager.GetUserAsync(User);

        //    if (user == null) {
        //        return Unauthorized();
        //    }


        //}

        [HttpPost]
        public async Task<IActionResult> CreateNewAquarium(int aquariumNumber) {
            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            if (aquariumNumber < 2) {
                return BadRequest("Aquarium 1 is created automatically.");
            }

            var aquariums = await GetOrCreateAquariumsAsync(user.Id);
            if (aquariumNumber <= aquariums.Count) {
                var existingAquarium = aquariums[aquariumNumber - 1];
                return Json(new {
                    aquariumNumber,
                    aquariumId = existingAquarium.AquariumId,
                    completionPercentage = GetAquariumCompletionPercentage(existingAquarium)
                });
            }

            if (aquariumNumber != aquariums.Count + 1) {
                return BadRequest("Aquariums must be created in order.");
            }

            var previousAquariumNumber = aquariums.Count;
            if (!_progressLimitSettings.IsDisabled &&
                GetAquariumCompletionPercentage(aquariums[previousAquariumNumber - 1]) < 100) {
                return BadRequest(
                    $"Another aquarium can not be made until aquarium {previousAquariumNumber} reaches 100%.");
            }

            var newAquarium = new Aquarium {
                MaxFish = 10,
                MaxObjects = 5,
                CurrentFish = 0,
                CurrentObjects = 0,
                CompletionPercentage = 0,
                UserId = user.Id
            };

            _context.Aquariums.Add(newAquarium);
            await _context.SaveChangesAsync();

            return Json(new {
                aquariumNumber,
                aquariumId = newAquarium.AquariumId,
                completionPercentage = GetAquariumCompletionPercentage(newAquarium)
            });
        }

        public async Task<IActionResult> GetAllAquariumFish(int aquariumId) {
            try {
                var user = await userManager.GetUserAsync(User);

                if (user == null) {
                    return NotFound();
                }

                var aquarium = await _context.Aquariums
                    .FirstOrDefaultAsync(a => a.UserId == user.Id && a.AquariumId == aquariumId);
                if (aquarium == null) {
                    return NotFound("Aquarium was not found.");
                }

                var userFishInAquarium = await _context.UserFish
                    .Where(uf => uf.UserId == user.Id
                        && uf.IsInAquarium
                        && uf.AquariumId == aquariumId)
                    .ToListAsync();

                var fishList = new List<object>();

                foreach (var uf in userFishInAquarium) {
                    var fish = await _httpClient.GetFromJsonAsync<Fish>(
                        $"https://innertideapi.vercel.app/api/v1/fish/{uf.FishId}");

                    fishList.Add(new {
                        uf.UserFishId,
                        uf.FishId,
                        uf.xCord,
                        uf.yCord,
                        uf.AcquiredAt,
                        isFirstPlaced = aquarium.FirstPlacedUserFishId == uf.UserFishId,
                        fish.Sprite,
                        fish.Species,
                        fish.Description,
                        fish.Height,
                        fish.Width,
                        fish.FunFacts
                    });
                }

                return Json(fishList);
            } catch (Exception e) {
                _logger.LogError(e, "Could not load fish placed in the aquarium.");
                return StatusCode(500, e.GetBaseException().Message);
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetAquariumObjects(int aquariumId) {
            try {
                var user = await userManager.GetUserAsync(User);
                if (user == null) {
                    return Unauthorized();
                }

                var aquarium = await _context.Aquariums
                    .FirstOrDefaultAsync(a => a.UserId == user.Id && a.AquariumId == aquariumId);
                if (aquarium == null) {
                    return NotFound("Aquarium was not found.");
                }

                var placedItems = await _context.UserItems
                    .Where(item => item.UserId == user.Id
                        && item.IsInAquarium
                        && item.AquariumId == aquariumId
                        && item.SandLayer != null
                        && item.GridX != null
                        && item.GridY != null)
                    .ToListAsync();

                var itemList = new List<object>();
                foreach (var placedItem in placedItems) {
                    var item = await _httpClient.GetFromJsonAsync<Item>(
                        $"https://innertideapi.vercel.app/api/v1/item/{Uri.EscapeDataString(placedItem.ItemId)}");
                    if (item == null) {
                        throw new InvalidOperationException($"The item catalog returned no data for item {placedItem.ItemId}.");
                    }

                    itemList.Add(new {
                        userItemId = placedItem.UserItemId,
                        item.ItemId,
                        item.Sprite,
                        item.Name,
                        item.GridSpace,
                        sandLayer = placedItem.SandLayer,
                        gridX = placedItem.GridX,
                        gridY = placedItem.GridY
                    });
                }

                return Json(itemList);
            } catch (Exception ex) {
                _logger.LogError(ex, "Could not load objects placed in the aquarium.");
                return StatusCode(500, ex.GetBaseException().Message);
            }
        }

        [HttpPost]
        public async Task<IActionResult> PlaceAquariumObject([FromBody] AquariumObjectRequest request) {
            if (request == null
                || request.UserItemId <= 0
                || request.AquariumId <= 0
                || request.SandLayer < 0
                || request.SandLayer > 2
                || request.GridX < 0
                || request.GridY < 0) {
                return BadRequest("The object placement is invalid.");
            }

            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            var userItem = await _context.UserItems
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.UserId == user.Id && item.UserItemId == request.UserItemId);
            if (userItem == null || (userItem.IsInAquarium && userItem.AquariumId != request.AquariumId)) {
                return BadRequest("The item is not available for this aquarium.");
            }

            var aquariumExists = await _context.Aquariums
                .AnyAsync(aquarium => aquarium.UserId == user.Id && aquarium.AquariumId == request.AquariumId);
            if (!aquariumExists) {
                return NotFound("Aquarium was not found.");
            }

            Item? catalogItem;
            try {
                catalogItem = await _httpClient.GetFromJsonAsync<Item>(
                    $"https://innertideapi.vercel.app/api/v1/item/{Uri.EscapeDataString(userItem.ItemId)}");
            } catch (Exception ex) {
                _logger.LogError(ex, "Could not load catalog data for item {ItemId}.", userItem.ItemId);
                return Problem(
                    detail: "The item catalog is temporarily unavailable. Please try again.",
                    statusCode: StatusCodes.Status502BadGateway);
            }

            if (catalogItem == null || !TryParseGridSpace(catalogItem.GridSpace, out var itemWidth, out var itemHeight)) {
                _logger.LogWarning("Item {ItemId} has invalid grid dimensions {GridSpace}.", userItem.ItemId, catalogItem?.GridSpace);
                return Problem(
                    detail: "This item has invalid placement dimensions and cannot be placed.",
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            if (request.GridX >= AquariumObjectGridColumns
                || request.GridY >= AquariumObjectGridRows
                || itemWidth > AquariumObjectGridColumns
                || itemHeight > AquariumObjectGridRows
                || request.GridX + itemWidth > AquariumObjectGridColumns
                || request.GridY + itemHeight > AquariumObjectGridRows) {
                return BadRequest("The item does not fit in the selected sand grid.");
            }

            try {
                await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
                var aquarium = await _context.Aquariums
                    .FirstOrDefaultAsync(a => a.UserId == user.Id && a.AquariumId == request.AquariumId);
                userItem = await _context.UserItems
                    .FirstOrDefaultAsync(item => item.UserId == user.Id && item.UserItemId == request.UserItemId);

                if (aquarium == null || userItem == null
                    || (userItem.IsInAquarium && userItem.AquariumId != aquarium.AquariumId)) {
                    return BadRequest("The item is not available for this aquarium.");
                }

                var isAlreadyPlaced = userItem.IsInAquarium;
                if (!isAlreadyPlaced && aquarium.CurrentObjects >= aquarium.MaxObjects) {
                    return Conflict("This aquarium is full.");
                }

                var overlaps = await _context.AquariumItemGridCells.AnyAsync(cell =>
                    cell.AquariumId == aquarium.AquariumId
                    && cell.SandLayer == request.SandLayer
                    && cell.UserItemId != userItem.UserItemId
                    && cell.GridX >= request.GridX
                    && cell.GridX < request.GridX + itemWidth
                    && cell.GridY >= request.GridY
                    && cell.GridY < request.GridY + itemHeight);
                if (overlaps) {
                    return Conflict("That object would overlap another object.");
                }

                if (isAlreadyPlaced) {
                    var existingCells = await _context.AquariumItemGridCells
                        .Where(cell => cell.AquariumId == aquarium.AquariumId && cell.UserItemId == userItem.UserItemId)
                        .ToListAsync();
                    _context.AquariumItemGridCells.RemoveRange(existingCells);
                    await _context.SaveChangesAsync();
                } else {
                    aquarium.CurrentObjects++;
                }

                userItem.IsInAquarium = true;
                userItem.AquariumId = aquarium.AquariumId;
                userItem.SandLayer = request.SandLayer;
                userItem.GridX = request.GridX;
                userItem.GridY = request.GridY;

                for (var x = request.GridX; x < request.GridX + itemWidth; x++) {
                    for (var y = request.GridY; y < request.GridY + itemHeight; y++) {
                        _context.AquariumItemGridCells.Add(new AquariumItemGridCell {
                            AquariumId = aquarium.AquariumId,
                            UserItemId = userItem.UserItemId,
                            SandLayer = request.SandLayer,
                            GridX = x,
                            GridY = y
                        });
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return Ok(new { success = true });
            } catch (Exception ex) {
                _logger.LogError(ex, "Could not place object {UserItemId} in aquarium {AquariumId}.", request.UserItemId, request.AquariumId);
                return StatusCode(500, ex.GetBaseException().Message);
            }
        }

        [HttpPost]
        public async Task<IActionResult> RemoveAquariumObject([FromBody] AquariumObjectRequest request) {
            if (request == null || request.UserItemId <= 0 || request.AquariumId <= 0) {
                return BadRequest("The object return request is invalid.");
            }

            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            try {
                await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
                var aquarium = await _context.Aquariums
                    .FirstOrDefaultAsync(a => a.UserId == user.Id && a.AquariumId == request.AquariumId);
                var userItem = await _context.UserItems
                    .FirstOrDefaultAsync(item => item.UserId == user.Id
                        && item.UserItemId == request.UserItemId
                        && item.IsInAquarium
                        && item.AquariumId == request.AquariumId);
                if (aquarium == null || userItem == null) {
                    return NotFound("The placed object was not found.");
                }

                var occupiedCells = await _context.AquariumItemGridCells
                    .Where(cell => cell.AquariumId == aquarium.AquariumId && cell.UserItemId == userItem.UserItemId)
                    .ToListAsync();
                _context.AquariumItemGridCells.RemoveRange(occupiedCells);
                userItem.IsInAquarium = false;
                userItem.AquariumId = null;
                userItem.SandLayer = null;
                userItem.GridX = null;
                userItem.GridY = null;
                aquarium.CurrentObjects = Math.Max(0, aquarium.CurrentObjects - 1);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return Ok(new { success = true });
            } catch (Exception ex) {
                _logger.LogError(ex, "Could not return object {UserItemId} from aquarium {AquariumId}.", request.UserItemId, request.AquariumId);
                return StatusCode(500, ex.GetBaseException().Message);
            }
        }

        private static bool TryParseGridSpace(string? gridSpace, out int width, out int height) {
            width = 0;
            height = 0;
            var dimensions = gridSpace?.ToLowerInvariant().Split('x', StringSplitOptions.TrimEntries);
            return dimensions is { Length: 2 }
                && int.TryParse(dimensions[0], out width)
                && int.TryParse(dimensions[1], out height)
                && width > 0
                && height > 0;
        }

        [HttpPost]
        public async Task<IActionResult> AddFishToAquarium( [FromBody] AquariumFishRequest request) {
            try {
                var user = await userManager.GetUserAsync(User);

                if (user == null) {
                    return NotFound();
                }
                if (request == null) {
                    return BadRequest("Request was null.");
                }

                int userFishId = (int)request.UserFishId;
                int aquariumId = request.AquariumId;
                int x = (int)Math.Round((double)request.X);
                int y = (int)Math.Round((double)request.Y);

                var aquarium = await _context.Aquariums.FirstOrDefaultAsync(a => a.UserId == user.Id && a.AquariumId == aquariumId);
                var userFish = await _context.UserFish.FirstOrDefaultAsync(uf => uf.UserId == user.Id && uf.UserFishId == userFishId);

                if (userFish.IsInAquarium) {
                    return BadRequest("Fish is already in an aquarium.");
                }

                if (aquarium == null) {
                    return BadRequest("Aquarium was not Found");
                }

                if (userFish == null) {
                    return BadRequest("User Fish was not Found");
                }

                if (aquarium.CurrentFish + 1 <= aquarium.MaxFish) {
                    aquarium.CurrentFish += 1;
                    aquarium.CompletionPercentage = (int)Math.Round( ((double)aquarium.CurrentFish / aquarium.MaxFish) * 100 );
                    aquarium.FirstPlacedUserFishId ??= userFish.UserFishId;

                    userFish.IsInAquarium = true;
                    userFish.AquariumId = aquarium.AquariumId;
                    userFish.xCord = x;
                    userFish.yCord = y;

                    await _context.SaveChangesAsync();

                    return Ok(new {
                        acquiredAt = userFish.AcquiredAt,
                        isFirstPlaced = aquarium.FirstPlacedUserFishId == userFish.UserFishId
                    });
                    
                } else {
                    return BadRequest("All Aquariums are Full.");
                }

            } catch (Exception e) {
                _logger.LogError(e, "Could not place a fish in the aquarium.");
                return StatusCode(500, e.GetBaseException().Message);
            }
        }

        [HttpPost]
        public async Task<IActionResult> MoveAquariumFish([FromBody] AquariumFishRequest request) {
            if (request == null || request.UserFishId <= 0 || request.AquariumId <= 0
                || request.X < 0 || request.Y < 0) {
                return BadRequest("The fish move request is invalid.");
            }

            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            var aquarium = await _context.Aquariums
                .FirstOrDefaultAsync(item => item.UserId == user.Id && item.AquariumId == request.AquariumId);
            var userFish = await _context.UserFish
                .FirstOrDefaultAsync(item => item.UserId == user.Id
                    && item.UserFishId == request.UserFishId
                    && item.IsInAquarium
                    && item.AquariumId == request.AquariumId);
            if (aquarium == null || userFish == null) {
                return NotFound("The fish was not found in this aquarium.");
            }

            userFish.xCord = request.X;
            userFish.yCord = request.Y;
            try {
                await _context.SaveChangesAsync();
                return Ok(new { success = true });
            } catch (Exception ex) {
                _logger.LogError(ex, "Could not move fish {UserFishId} in aquarium {AquariumId}.", request.UserFishId, request.AquariumId);
                return StatusCode(500, ex.GetBaseException().Message);
            }
        }

        [HttpPost]
        public async Task<IActionResult> RemoveFishFromAquarium([FromBody] AquariumFishRequest request) {
            try {
                var user = await userManager.GetUserAsync(User);

                if (user == null) {
                    return NotFound();
                }

                int userFishId = (int)request.UserFishId;
                int aquariumId = request.AquariumId;
                int x = (int)Math.Round((double)request.X);
                int y = (int)Math.Round((double)request.Y);

                var userFish = await _context.UserFish.FirstOrDefaultAsync(uf => uf.UserId == user.Id && uf.UserFishId == userFishId);
                var currentAquarium = await _context.Aquariums.FirstOrDefaultAsync(a => a.AquariumId == aquariumId);

                if (userFish == null) {
                    return BadRequest("User Fish was not Found");
                }

                if (!userFish.IsInAquarium) {
                    return BadRequest("Fish is not in an aquarium.");
                }

                if (currentAquarium == null) {
                    return BadRequest("Aquarium was not Found");
                }

                currentAquarium.CurrentFish -= 1;
                currentAquarium.CompletionPercentage = (int)Math.Round(((double)currentAquarium.CurrentFish / currentAquarium.MaxFish) * 100);

                userFish.IsInAquarium = false;
                userFish.AquariumId = null;
                userFish.xCord = 0;
                userFish.yCord = 0;

                _context.Aquariums.Update(currentAquarium);
                _context.UserFish.Update(userFish);

                await _context.SaveChangesAsync();

                return Ok();

            } catch (Exception e) {
                return StatusCode(500, e.Message);
            }
        }
    }
}
