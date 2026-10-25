using Inner_Tide.Data;
using Inner_Tide.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

                List<Fish> fishList = new List<Fish>();

                var res = await _httpClient.GetAsync("https://innertideapi.vercel.app/api/v1/fish");

                //if (res != null) {
                //    foreach (var fish in res) {
                //        fishList.Add(res);
                //    }
                //}

                return Json(fishList);

            } catch (Exception ex) {

            }

            return NotFound();
        }

        public async Task<IActionResult> GetUserFish() {
            try {
                var user = await userManager.GetUserAsync(User);

                if (user == null) {
                    return NotFound();
                }

                var userFish = await _context.UserFish.Where(uf => uf.UserId == user.Id )
                                        .Select(uf => new {
                                            uf.UserFishId,
                                            uf.FishId
                                        }).ToListAsync();

                List<Fish> fishList = new List<Fish>();

                foreach (var fish in userFish) {
                    var res = await _httpClient.GetFromJsonAsync<Fish>("https://innertideapi.vercel.app/api/v1/fish/" + fish.FishId);

                    if (res != null) {
                        fishList.Add(res);
                    }
                }//end foreach

                return Json(fishList);

            } catch (Exception ex) {

            }

            return NotFound();
        }
    }
}

