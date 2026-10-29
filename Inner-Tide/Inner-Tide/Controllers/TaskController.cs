using Microsoft.AspNetCore.Mvc;

namespace Inner_Tide.Controllers {
    public class TaskController : Controller {
        public IActionResult Index() {
            if (User.Identity?.IsAuthenticated != true) {
                return Redirect("/Users/Index");
            }

            return View("Index");
        }
    }
}
