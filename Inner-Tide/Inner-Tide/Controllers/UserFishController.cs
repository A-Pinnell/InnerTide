using Inner_Tide.Data;
using Inner_Tide.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Inner_Tide.Controllers {
    public class UserFishController : Controller {
        private readonly SignInManager<User> signInManager;
        private readonly UserManager<User> userManager;
        private readonly HttpClient _httpClient;

        // Shared db connection obj
        ApplicationDbContext _context;

        public UserFishController(ApplicationDbContext context, SignInManager<User> signInManager,
                                    UserManager<User> userManager, HttpClient httpClient) {
            this.signInManager = signInManager;
            this.userManager = userManager;
            _httpClient = httpClient;
            _context = context;
        }

        public IActionResult Index() {
            return View();
        }
    }
}
