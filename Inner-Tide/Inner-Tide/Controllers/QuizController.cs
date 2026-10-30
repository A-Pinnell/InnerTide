using Inner_Tide.Data;
using Inner_Tide.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Inner_Tide.Controllers
{
    public class QuizController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<User> _userManager;

        public QuizController(ApplicationDbContext context, UserManager<User> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        public async Task<IActionResult> Index()
        {
            if (User.Identity?.IsAuthenticated != true)
            {
                return Redirect("/Users/Index");
            }

            var quizzes = await _context.Quizzes
                .AsNoTracking()
                .Where(quiz => quiz.QuizTitle != Quiz.SetupQuizTitle)
                .OrderBy(quiz => quiz.QuizId)
                .ToListAsync();

            return View("Index", quizzes);
        }

        public async Task<IActionResult> Question(int id)
        {
            if (User.Identity?.IsAuthenticated != true)
            {
                return Redirect("/Users/Index");
            }

            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            if (id <= 0)
            {
                return BadRequest("A valid quiz must be selected.");
            }

            var quizExists = await _context.Quizzes.AnyAsync(quiz => quiz.QuizId == id);
            if (!quizExists)
            {
                return NotFound("The selected quiz was not found.");
            }

            var quizQuestions = await _context.QuizQuestions
                .AsNoTracking()
                .Where(quizQuestion => quizQuestion.QuizId == id && quizQuestion.UserId == null)
                .Include(quizQuestion => quizQuestion.Question)
                .OrderBy(quizQuestion => quizQuestion.Question!.DisplayOrder)
                .ThenBy(quizQuestion => quizQuestion.QuestionId)
                .ToListAsync();

            if (quizQuestions.Count == 0)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, "The selected quiz has no questions configured.");
            }

            await using var transaction = await _context.Database.BeginTransactionAsync();
            await _context.QuizQuestions
                .Where(quizQuestion => quizQuestion.QuizId == id && quizQuestion.UserId == user.Id)
                .ExecuteDeleteAsync();

            var userQuizQuestions = quizQuestions.Select(quizQuestion => new QuizQuestion
            {
                QuizId = id,
                UserId = user.Id,
                QuestionId = quizQuestion.QuestionId,
                AnswerValue = 0
            }).ToList();

            _context.QuizQuestions.AddRange(userQuizQuestions);
            await _context.SaveChangesAsync();
            userQuizQuestions = await _context.QuizQuestions
                .AsNoTracking()
                .Where(quizQuestion => quizQuestion.QuizId == id && quizQuestion.UserId == user.Id)
                .Include(quizQuestion => quizQuestion.Question)
                .OrderBy(quizQuestion => quizQuestion.Question!.DisplayOrder)
                .ThenBy(quizQuestion => quizQuestion.QuestionId)
                .ToListAsync();
            await transaction.CommitAsync();

            return View("Question", userQuizQuestions);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SaveAnswer([FromForm] int quizQuestionId, [FromForm] int answerValue)
        {
            if (User.Identity?.IsAuthenticated != true)
            {
                return Unauthorized();
            }

            if (answerValue is < 1 or > 5)
            {
                return BadRequest("Answer values must be between 1 and 5.");
            }

            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            var quizQuestion = await _context.QuizQuestions
                .SingleOrDefaultAsync(question => question.QuizQuestionId == quizQuestionId && question.UserId == user.Id);
            if (quizQuestion == null)
            {
                return NotFound("The quiz question was not found for the current user.");
            }

            quizQuestion.AnswerValue = answerValue;
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
