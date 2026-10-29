using Inner_Tide.Models;
using Microsoft.AspNetCore.Mvc;

namespace Inner_Tide.Controllers {
    public class UserTaskController : Controller {
        public IActionResult Index() {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> CreateUserTasks([FromBody] CategoryValues values) {
            


            return NotFound();
        }

    }
}
