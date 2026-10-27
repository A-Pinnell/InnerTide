using Inner_Tide.Data;
using Inner_Tide.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using System.Threading.Channels;

namespace Inner_Tide.Controllers {
    public class AquariumController : Controller {
        private readonly SignInManager<User> signInManager;
        private readonly UserManager<User> userManager;
        private readonly HttpClient _httpClient;
        private readonly ILogger<AquariumController> _logger;

        // Shared db connection obj
        ApplicationDbContext _context;

        public AquariumController(ApplicationDbContext context, SignInManager<User> signInManager, 
                                    UserManager<User> userManager, HttpClient httpClient, ILogger<AquariumController> logger) {
            this.signInManager = signInManager;
            this.userManager = userManager;
            _httpClient = httpClient;
            _logger = logger;
            _context = context;
        }
        public async Task<IActionResult> Index(int aquarium = 1) {
            if (User.Identity?.IsAuthenticated != true)
            {
                return Redirect("/Users/Index");
            }

            if (aquarium < 1) {
                return NotFound();
            }

            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            var aquariums = await GetOrCreateAquariumsAsync(user.Id);
            if (aquarium > aquariums.Count) {
                return NotFound();
            }

            var selectedAquarium = aquariums[aquarium - 1];
            var backgroundNumber = aquarium <= 5 ? aquarium : ((aquarium - 6) % 5) + 1;
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
                                            uf.FishId
                                        }).ToListAsync();

                var fishList = new List<object>();

                foreach (var fish in userFish) {
                    var res = await _httpClient.GetFromJsonAsync<Fish>("https://innertideapi.vercel.app/api/v1/fish/" + fish.FishId);

                    if (res != null) {
                        fishList.Add(new {
                            userFishId = fish.UserFishId,
                            fishId = res.FishId,
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

            }

            return NotFound();
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

                var userItems = await _context.UserItems.Where(ui => ui.UserId == user.Id && ui.IsInAquarium == false)
                                        .Select(ui => new {
                                            ui.UserItemId,
                                            ui.ItemId
                                        }).ToListAsync();

                List<Item> itemList = new List<Item>();

                foreach (var item in userItems) {
                    var res = await _httpClient.GetFromJsonAsync<Item>("https://innertideapi.vercel.app/api/v1/item/" + item.ItemId);

                    if (res != null) {
                        itemList.Add(res);
                    }
                }//end foreach

                return Json(itemList);

            } catch (Exception ex) {

            }

            return NotFound();
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
                        remainingCoins = user.CoinCount
                    });
                }

            } catch (Exception ex) {
            }

            return NotFound();
        }

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
                        fish.Sprite,
                        fish.Species
                    });
                }

                return Json(fishList);
            } catch (Exception e) {}
            return NotFound();
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

                if (aquarium.CurrentFish + 1 <= aquarium.MaxFish) {
                    aquarium.CurrentFish += 1;
                    aquarium.CompletionPercentage = (int)Math.Round( ((double)aquarium.CurrentFish / aquarium.MaxFish) * 100 );

                    userFish.IsInAquarium = true;
                    userFish.AquariumId = aquarium.AquariumId;
                    userFish.xCord = x;
                    userFish.yCord = y;

                    await _context.SaveChangesAsync();

                    return Ok();
                    
                } else {
                    return BadRequest("All Aquariums are Full.");
                }

            } catch (Exception e) {
                return BadRequest(e.Message);
            }
            return NotFound();
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
