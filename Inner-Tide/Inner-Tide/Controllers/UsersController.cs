using Inner_Tide.Data;
using Inner_Tide.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Inner_Tide.Controllers {
    public class UsersController : Controller {
        // shared db connection obj
        ApplicationDbContext _context;

        // constructor: every time controller instance created, pass in a db connection obj
        public UsersController(ApplicationDbContext context) {
            _context = context;
        }

        public IActionResult Index() {
            return View("Index");
        }

        [HttpPost] 
        public IActionResult Register( [Bind("Username", "Email", "Password")] User user) {
            //IdentityUser identityUser = new IdentityUser();
            
            //Check if the Model State is Correct
            if (!ModelState.IsValid) {
                return View("Index");
            }

            ////Password Hashing
            //var hasher = new PasswordHasher<IdentityUser>();
            //string hash = hasher.HashPassword(identityUser, "MyPassword123!");

            //user.Password = hash;
            //user.CoinCount = 0;
            //user.AccountLevel = 1;
            //user.XPForNextLevel = 100;

            //// save to db using DbSet object
            //_context.UserAccounts.Add(user);
            //_context.SaveChanges();

            return RedirectToAction("Index", "Home");
        }

        //[HttpPost]
        //public IActionResult Login() User user) {

        //    return RedirectToAction("Index", "Home");
        //}
    }
}
