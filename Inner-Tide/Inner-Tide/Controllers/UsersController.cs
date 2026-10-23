using Azure.Identity;
using Inner_Tide.Data;
using Inner_Tide.Models;
using Inner_Tide.ViewModels;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Inner_Tide.Controllers {
    public class UsersController : Controller {
        private readonly SignInManager<User> signInManager;
        private readonly UserManager<User> userManager;

        // Shared db connection obj
        ApplicationDbContext _context;

        public UsersController(SignInManager<User> signInManager, UserManager<User> userManager, ApplicationDbContext context) {
            this.signInManager = signInManager;
            this.userManager = userManager;
            _context = context;
        }

        public IActionResult Index() {
            return View(new AccountViewModel {
                Register = new RegisterViewModel(),
                Login = new LoginViewModel()
            });
        }

        [HttpPost]
        public async Task<IActionResult> Register(AccountViewModel model) {
            RegisterViewModel user = model.Register;

            ModelState.Remove("Login.Email");
            ModelState.Remove("Login.Password");

            if (!ModelState.IsValid) {
                return View("Index", model);
            }

            User newUser = new User {
                UserName = user.UserName,
                Email = user.Email,
                CoinCount = 0,
                AccountLevel = 1,
                XPForNextLevel = 10
            };

            var result = await userManager.CreateAsync(newUser, user.Password);

            if (result.Succeeded) {
                return RedirectToAction("Index", "Users");
            }

            foreach (var error in result.Errors) {
                ModelState.AddModelError("", error.Description);
            }

            return View("Index", model);
        }

        [HttpPost]
        public IActionResult Login() {
            return RedirectToAction("Index", "Users");
        }
    }
}
