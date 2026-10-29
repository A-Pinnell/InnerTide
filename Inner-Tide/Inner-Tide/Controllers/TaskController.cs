using Microsoft.AspNetCore.Mvc;

namespace Inner_Tide.Controllers {
    public class TaskController : Controller {
        public IActionResult Index() {
            return View();
        }
    }
}
