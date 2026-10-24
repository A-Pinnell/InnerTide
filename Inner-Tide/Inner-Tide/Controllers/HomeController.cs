using Inner_Tide.Data;
using Inner_Tide.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;

namespace Inner_Tide.Controllers
{
    public class HomeController : Controller {
        private readonly SignInManager<User> signInManager;
        private readonly UserManager<User> userManager;

        // Shared db connection obj
        ApplicationDbContext _context;

        public HomeController(ApplicationDbContext context, SignInManager<User> signInManager, UserManager<User> userManager) {
            this.signInManager = signInManager;
            this.userManager = userManager;
            _context = context;
        }

        public IActionResult Index() {
            if (User.Identity?.IsAuthenticated != true) {
                return Redirect("/Users/Index");
            }

        public IActionResult Index()
        {
            if (User.Identity?.IsAuthenticated != true)
            {
                return Redirect("/Users/Index");
            }

            return View("Index");
        }

        public IActionResult Privacy() {
            return View("Privacy");
        }

        [HttpGet]
        public async Task<IActionResult> GetTasks() {
            try {
            var user = await userManager.GetUserAsync(User);

            if (user == null) {
                return NotFound();
            }

            if (userManager == null) {
                return Content("userManager is null");
            }

            if (_context == null) {
                return Content("_context is null");
            }

                var userId = user.Id;

            var userTasks = await _context.UserTasks.Where(ut => ut.UserId == user.Id && ut.Task != null)
                                                    .Select(ut => new {
                                                        ut.Task.TaskId,
                                                        ut.Task.Title,
                                                        ut.Task.TimeFrame,
                                                        ut.Task.CoinReward,
                                                        ut.Task.Multiplier,
                                                        ut.Task.Priority,
                                                        ut.Task.Completed
                                                    }).ToListAsync();

            return Json(new {
                daily = userTasks.Where(c => c.TimeFrame == "Daily"),
                weekly = userTasks.Where(c => c.TimeFrame == "Weekly"),
                monthly = userTasks.Where(c => c.TimeFrame == "Monthly")
            });
            } catch (Exception ex) {
                return Content(
                ex.Message + Environment.NewLine +
                ex.InnerException?.Message + Environment.NewLine +
                ex.StackTrace
            );
            }
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error() {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
