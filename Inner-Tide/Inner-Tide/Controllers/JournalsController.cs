using Microsoft.AspNetCore.Mvc;

namespace Inner_Tide.Controllers {
    public class JournalsController : Controller {
        public IActionResult Index() {
            return View("Index");
        }
    }
}
