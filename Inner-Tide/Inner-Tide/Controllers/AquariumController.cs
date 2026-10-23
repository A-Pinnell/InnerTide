using Microsoft.AspNetCore.Mvc;

namespace Inner_Tide.Controllers {
    public class AquariumController : Controller {
        public IActionResult Index() {
            return View("Index");
        }
    }
}
