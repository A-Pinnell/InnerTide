using Azure.Identity;
using Inner_Tide.Data;
using Inner_Tide.Models;
using Inner_Tide.ViewModels;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace Inner_Tide.Controllers {
    public class AddCoinModel() {
        public int Amount { get; set; }
    }
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

            //Ensure That the Login Form Isn't Checked
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
                XPForNextLevel = 100,
                FirstTimeLogin = false
            };

            await _context.SaveChangesAsync();

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
        public async Task<IActionResult> Login(AccountViewModel model) {
            LoginViewModel user = model.Login;

            //Ensure That the Register Form Isn't Checked
            ModelState.Remove("Register.UserName");
            ModelState.Remove("Register.Email");
            ModelState.Remove("Register.Password");
            ModelState.Remove("Register.ConfirmPassword");

            if (!ModelState.IsValid) {
                return View("Index", model);
            }

            var foundUser = await userManager.FindByEmailAsync(user.Email);

            if (foundUser == null) {
                ModelState.AddModelError("", "Email or Password is Incorrect");
                return View("Index", model);
            }

            var result = await signInManager.PasswordSignInAsync(foundUser.UserName, user.Password, user.RememberMe, false);

            if (result.Succeeded) {
                var userData = await userManager.GetUserAsync(User);
                if (userData == null) {
                    return Unauthorized();
                }

                var aquariums = _context.Aquariums.Where(a => a.UserId == userData.Id).ToList();

                if (aquariums.Count() <= 0) {
                    var aquarium = new Aquarium {
                        UserId = userData.Id,
                        MaxFish = 10,
                        MaxObjects = 10,
                        CurrentFish = 0,
                        CurrentObjects = 0,
                        CompletionPercentage = 0
                    };

                    _context.Aquariums.Add(aquarium);
                    await _context.SaveChangesAsync();
                }

                return RedirectToAction("Index", "Home");
            } else {
                ModelState.AddModelError("", "Email or Password is Incorrect");

                return View("Index", model);
            }

        }

        public async Task<IActionResult> Logout() {
            await signInManager.SignOutAsync();
            return RedirectToAction("Index", "Home");
        }

        public IActionResult VerifyEmail() {
            return View("VerifyEmail");
        }

        [HttpPost]
        public async Task<IActionResult> VerifyEmail(VerifyEmailViewModel model) {
            if (!ModelState.IsValid) {
                return View("VerifyEmail");
            }

            var user = await userManager.FindByEmailAsync(model.Email);

            if (user == null) {
                ModelState.AddModelError("", "User was not Found");
                return View("VerifyEmail", model);
            } else {
                return RedirectToAction("ChangePassword", "Users", new { email = user.Email} );
            }
        }

        public IActionResult ChangePassword(string email) {
            if (string.IsNullOrEmpty(email)) {
                RedirectToAction("VerifyEmail", "Users");
            }

            return View(new ChangePasswordViewModel { Email = email });
        }

        [HttpPost]
        public async Task<IActionResult> ChangePassword(ChangePasswordViewModel model) {
            if (!ModelState.IsValid) {
                return View("ChangePassword");
            }

            var user = await userManager.FindByEmailAsync(model.Email);

            if (user != null) {
                var result = await userManager.RemovePasswordAsync(user);

                if (result.Succeeded) {
                    result = await userManager.AddPasswordAsync(user, model.NewPassword);
                    return RedirectToAction("Index", "Users");
                } else {
                    foreach (var error in result.Errors) {
                        ModelState.AddModelError("", error.Description);
                    }

                    return View(model);
                }

            } else {
                ModelState.AddModelError("", "Email Not Found");
                return View(model);
            }
        }

        [HttpPost]
        public async Task<IActionResult> UpdateAccountSettings(AccountSettingsViewModel model) {
            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            model.NewUserName = string.IsNullOrWhiteSpace(model.NewUserName) ? null : model.NewUserName.Trim();
            model.NewEmail = string.IsNullOrWhiteSpace(model.NewEmail) ? null : model.NewEmail.Trim();

            if (!ModelState.IsValid) {
                return AccountSettingsFailure(string.Join(" ", ModelState.Values
                    .SelectMany(value => value.Errors)
                    .Select(error => error.ErrorMessage)));
            }
            var changesUserName = model.NewUserName != null && model.NewUserName != user.UserName;
            var changesEmail = model.NewEmail != null && model.NewEmail != user.Email;

            if (!changesUserName && !changesEmail) {
                return AccountSettingsFailure("Enter at least one new account value.");
            }

            if (!await userManager.CheckPasswordAsync(user, model.CurrentPassword)) {
                return AccountSettingsFailure("Your current password is incorrect.");
            }

            if (changesUserName) {
                var existingUser = await userManager.FindByNameAsync(model.NewUserName!);
                if (existingUser != null && existingUser.Id != user.Id) {
                    return AccountSettingsFailure("That username is already in use.");
                }
            }

            if (changesEmail) {
                var existingUser = await userManager.FindByEmailAsync(model.NewEmail!);
                if (existingUser != null && existingUser.Id != user.Id) {
                    return AccountSettingsFailure("That email address is already in use.");
                }
            }

            if (changesUserName || changesEmail) {
                if (changesUserName) {
                    user.UserName = model.NewUserName;
                }

                if (changesEmail) {
                    user.Email = model.NewEmail;
                    user.EmailConfirmed = false;
                }

                var updateResult = await userManager.UpdateAsync(user);
                if (!updateResult.Succeeded) {
                    return AccountSettingsFailure(string.Join(" ", updateResult.Errors.Select(error => error.Description)));
                }
            }

            await signInManager.RefreshSignInAsync(user);
            TempData["AccountSettingsMessage"] = "Your account settings were updated.";
            TempData["AccountSettingsMessageType"] = "success";
            return RedirectToAction("Index", "Home");
        }

        private IActionResult AccountSettingsFailure(string message) {
            TempData["AccountSettingsMessage"] = message;
            TempData["AccountSettingsMessageType"] = "error";
            return RedirectToAction("Index", "Home");
        }

        [HttpPost]
        public async Task<IActionResult> AddCoins([FromBody] AddCoinModel model) {
            var user = await userManager.GetUserAsync(User);

            if (user == null)
                return Unauthorized();

            user.CoinCount += model.Amount;

            await userManager.UpdateAsync(user);

            return Ok(new { coins = user.CoinCount });
        }

        public async Task<IActionResult> GetCoins() {
            var user = await userManager.GetUserAsync(User);

            if (user == null)
                return Unauthorized();

            int coinCoint = user.CoinCount;

            string coinCountStr = coinCoint.ToString();

            return Json(new {
                coins = user.CoinCount
            });
        }
    }
}
