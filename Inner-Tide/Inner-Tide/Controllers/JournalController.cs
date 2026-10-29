using Microsoft.AspNetCore.Mvc;

namespace Inner_Tide.Controllers {
    public class JournalController : Controller {
        public IActionResult Index() {
            return View("Index");
        }
    }
}
