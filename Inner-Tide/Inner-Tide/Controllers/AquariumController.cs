using Inner_Tide.Data;
using Inner_Tide.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Inner_Tide.Controllers {
    public class AquariumController : Controller {
        private readonly SignInManager<User> signInManager;
        private readonly UserManager<User> userManager;
        private readonly HttpClient _httpClient;

        // Shared db connection obj
        ApplicationDbContext _context;

        public AquariumController(ApplicationDbContext context, SignInManager<User> signInManager, 
                                    UserManager<User> userManager, HttpClient httpClient) {
            this.signInManager = signInManager;
            this.userManager = userManager;
            _httpClient = httpClient;
            _context = context;
        }
        public IActionResult Index() {
            if (User.Identity?.IsAuthenticated != true)
            {
                return Redirect("/Users/Index");
            }

            return View("Index");
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
        public async Task<IActionResult> PurchaseShopFish(string fishId) {
            try {
                var user = await userManager.GetUserAsync(User);

                if (user == null) {
                    return NotFound();
                }

                var fish = await _httpClient.GetFromJsonAsync<Fish>("https://innertideapi.vercel.app/api/v1/fish/" + fishId);

                if (fish == null) {
                    return NotFound("Fish not Found");
                }

                var fishPrice = fish.Price;

                if (user.CoinCount >= fishPrice) {
                    var userFish = new UserFish {
                        UserId = user.Id,
                        FishId = fishId,
                        IsInAquarium = false
                    };

                    _context.UserFish.Add(userFish);

                    user.CoinCount -= fishPrice;

                    await _context.SaveChangesAsync();

                    return Ok(new {
                        success = true,
                        UserFishId = userFish.UserFishId,
                        fishId = fish.FishId,
                        fishSpecies = fish.Species,
                        coinsSpent = fishPrice,
                        remainingCoins = user.CoinCount
                    });
                }

            } catch (Exception ex) {
            }

            return NotFound();
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
                        IsInAquarium = false
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
        public async Task<IActionResult> CreateNewAquarium() {
            try {
                var user = await userManager.GetUserAsync(User);

                if (user == null) {
                    return NotFound();
                }

                var newAquarium = new Aquarium {
                    MaxFish = 10,
                    MaxObjects = 5,
                    CurrentFish = 0,
                    CurrentObjects = 0,
                    UserId = user.Id,
                };

                _context.Aquariums.Add(newAquarium);

                await _context.SaveChangesAsync();

            } catch (Exception ex) { }
            
            return NotFound();
        }

        [HttpPost]
        public async Task<IActionResult> AddFishToAquarium(string fishId, string userFishId) {
            try {
                var user = await userManager.GetUserAsync(User);

                if (user == null) {
                    return NotFound();
                }

                var aquariums = await _context.Aquariums.Where(a => a.UserId == user.Id).ToListAsync();
                var userFish = _context.UserFish.Where(uf => uf.UserId == user.Id && uf.UserFishId.ToString() == userFishId).ToList();

                if (aquariums == null || userFish == null) {
                    return NotFound();
                }

                if (aquariums.Count() == 1) {
                    var aquarium = aquariums.First();

                    if ( (aquarium.CurrentFish + 1) <= aquarium.MaxFish ) {
                        aquarium.CurrentFish += 1;

                        userFish.First().IsInAquarium = true;
                    }

                } else {
                    foreach (Aquarium aquarium in aquariums) {
                        if (aquarium.MaxFish == aquarium.CurrentFish) {
                            continue;
                        }

                        if ((aquarium.CurrentFish + 1) <= aquarium.MaxFish) {
                            aquarium.CurrentFish += 1;

                            userFish.First().IsInAquarium = true;
                        }
                    }
                }

            } catch (Exception e) {

            }
            return NotFound();
        }
    }
}
