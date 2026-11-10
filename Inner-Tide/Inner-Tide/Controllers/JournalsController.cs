using Inner_Tide.Data;
using Inner_Tide.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace Inner_Tide.Controllers {

    [Authorize]
    public class JournalsController : Controller {
        private readonly UserManager<User> userManager;
        private readonly HttpClient _httpClient;

        // Shared db connection obj
        ApplicationDbContext _context;

        public JournalsController(ApplicationDbContext context,
                                    UserManager<User> userManager, HttpClient httpClient) {
            this.userManager = userManager;
            _httpClient = httpClient;
            _context = context;
        }
        public IActionResult Index() {
            return View("Index");
        }

        [HttpGet]
        public async Task<IActionResult> GetAllJournalEntries() {
            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            var journals = await _context.Journals
                .Where(j => j.UserId == user.Id)
                .ToListAsync();

            return Json(journals);
        }

        [HttpGet]
        public async Task<IActionResult> GetJournalEntry(int journalId) {
            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            var journal = await _context.Journals.SingleOrDefaultAsync(j => j.JournalId == journalId && j.UserId == user.Id);

            return Json(journal);
        }

        [HttpGet]
        public IActionResult Create() {
            return View("Create");
        }


        [HttpPost]
        public async Task<IActionResult> Create(Journal journal) {
            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            journal.UserId = user.Id.ToString();
            journal.JournalCreation = DateTime.UtcNow;

            ModelState.Remove(nameof(Journal.UserId));
            ModelState.Remove(nameof(Journal.JournalCreation));

            if (!ModelState.IsValid) {
                return View("Create");
            }

            _context.Journals.Add(journal);
            _context.SaveChanges();

            return RedirectToAction("Index", "Journals");
        }

        [HttpPost]
        public async Task<IActionResult> Delete(int journalId) {
            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            var journal = await _context.Journals.FirstOrDefaultAsync(j => j.JournalId == journalId && j.UserId == user.Id);

            if (journal == null) {
                return NotFound();
            }

            if (!ModelState.IsValid) {
                return View("Create");
            }

            _context.Journals.Remove(journal);
            _context.SaveChanges();

            return RedirectToAction("Index", "Journals");
        }
    }
}
