using Microsoft.AspNetCore.Mvc;

namespace Inner_Tide.Controllers {
    public class TestingController : Controller {
        public IActionResult Index() {
            return View("Index");
        }
    }
}
