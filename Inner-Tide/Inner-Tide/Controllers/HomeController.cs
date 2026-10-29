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

        public async Task<IActionResult> Index()
        {
            if (User.Identity?.IsAuthenticated != true)
            {
                return Redirect("/Users/Index");
            }

            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            ViewData["AccountId"] = user?.Id;
            if (!await _context.Aquariums.AnyAsync(aquarium => aquarium.UserId == user.Id)) {
                _context.Aquariums.Add(new Aquarium {
                    MaxFish = 10,
                    MaxObjects = 5,
                    CurrentFish = 0,
                    CurrentObjects = 0,
                    CompletionPercentage = 0,
                    UserId = user.Id
                });
                await _context.SaveChangesAsync();
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

                var userTasks = await _context.UserTasks
                    .Where(ut => ut.UserId == user.Id)
                    .Include(ut => ut.Task)
                    .Select(ut => new {
                        ut.UserTaskId,
                        ut.TaskId,
                        ut.Task.Title,
                        ut.Task.TimeFrame,
                        ut.Task.CoinReward,
                        ut.Multiplier,
                        ut.Priority,
                        ut.Completed,
                    })
                    .ToListAsync();

                return Json(new {
                    daily = userTasks.Where(t => t.TimeFrame == "Daily"),
                    weekly = userTasks.Where(t => t.TimeFrame == "Weekly"),
                    monthly = userTasks.Where(t => t.TimeFrame == "Monthly")
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
