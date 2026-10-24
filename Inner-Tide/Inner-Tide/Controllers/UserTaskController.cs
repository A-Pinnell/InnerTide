using Microsoft.AspNetCore.Mvc;

namespace Inner_Tide.Controllers {
    public class UserTaskController : Controller {
        public IActionResult Index() {
            return View();
        }

    }
}
