using Inner_Tide.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.IdentityModel.Tokens;
using Task = Inner_Tide.Models.Task;

namespace Inner_Tide.Controllers {
    [Authorize(Roles = "Administrator")]
    public class TasksController : Controller {
        ApplicationDbContext _context;

        public TasksController(ApplicationDbContext context) {
            _context = context;
        }

        public IActionResult Index() {
            if (User.Identity?.IsAuthenticated != true) {
                return Redirect("/Users/Index");
            }

            var tasks = _context.Tasks.OrderBy(t => t.TaskId).ToList();

            return View("Index", tasks);
        }

        [HttpPost]
        public IActionResult Index(string categoryFilter) {
            if (User.Identity?.IsAuthenticated != true) {
                return Redirect("/Users/Index");
            }

            var tasks = new List<Task>();

            if (categoryFilter.IsNullOrEmpty()) {
                tasks = _context.Tasks.OrderBy(t => t.TaskId).ToList();

            } else {
                if (categoryFilter == "NONE") {
                    tasks = _context.Tasks.OrderBy(t => t.TaskId).ToList();
                } else {
                    tasks = _context.Tasks.Where(t => t.CategoryTag == categoryFilter).OrderBy(t => t.TaskId).ToList();
                }
            }

            return View("Index", tasks);
        }

        public IActionResult Create() {
            return View("Create");
        }

        [HttpPost]
        public IActionResult Create([Bind("Title, TimeFrame, CoinReward, CategoryTag")] Task task) {

            if (!ModelState.IsValid) {
                return View("Create", task);
            }

            _context.Tasks.Add(task);
            _context.SaveChanges();

            return RedirectToAction("Index");
        }

        [HttpGet]
        public IActionResult Update(int taskId) {
            var task = _context.Tasks.Find(taskId);

            if (task == null) {
                return NotFound();
            }        

            return View("Update", task);
        }

        [HttpPost]
        public IActionResult Update(int taskId, [Bind("TaskId, Title, TimeFrame, CoinReward, CategoryTag")] Task task) {
            if (!ModelState.IsValid) {
                return View("Update", task);
            }

            _context.Tasks.Update(task);
            _context.SaveChanges();

            return RedirectToAction("Index", task.CategoryTag);
        }

        public IActionResult Delete(int taskId) {
            var task = _context.Tasks.Find(taskId);

            if (task == null) {
                return NotFound();
            }

            _context.Tasks.Remove(task);
            _context.SaveChanges();

            return RedirectToAction("Index");
        }
    }
}
