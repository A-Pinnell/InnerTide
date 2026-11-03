using Azure.Identity;
using Inner_Tide.Data;
using Inner_Tide.Models;
using Inner_Tide.ViewModels;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace Inner_Tide.Controllers {
    public class AddCoinModel() {
        public int Amount { get; set; }
    }

    public class UsersController : Controller {
        private readonly SignInManager<User> signInManager;
        private readonly UserManager<User> userManager;

        // Shared db connection obj
        ApplicationDbContext _context;

        public UsersController(SignInManager<User> signInManager, UserManager<User> userManager, ApplicationDbContext context) {
            this.signInManager = signInManager;
            this.userManager = userManager;
            _context = context;
        }

        public IActionResult Index() {
            return View(new AccountViewModel {
                Register = new RegisterViewModel(),
                Login = new LoginViewModel()
            });
        }

        [HttpPost]
        public async Task<IActionResult> Register(AccountViewModel model) {
            RegisterViewModel user = model.Register;

            //Ensure That the Login Form Isn't Checked
            ModelState.Remove("Login.EmailOrUserName");
            ModelState.Remove("Login.Password");

            if (!ModelState.IsValid) {
                return View("Index", model);
            }

            var duplicateEmail = await userManager.FindByEmailAsync(user.Email);
            var duplicateUsername = await userManager.FindByNameAsync(user.UserName);

            if (duplicateEmail != null && duplicateUsername != null) {
                ModelState.AddModelError("Register.Email", "Email and Username are Already in use");
                return View("Index", model);
            }
            if (duplicateEmail != null) {

                ModelState.AddModelError("Register.Email", "Email is Already in use");
                return View("Index", model);

            } else if (duplicateUsername != null) {

                ModelState.AddModelError("Register.UserName", "Username is Already in use");
                return View("Index", model);
            }

            User newUser = new User {
                UserName = user.UserName,
                Email = user.Email,
                CoinCount = 0,
                AccountLevel = 1,
                XPForNextLevel = 100,
                FirstTimeLogin = false
            };

            var result = await userManager.CreateAsync(newUser, user.Password);

            if (result.Succeeded) {
                _context.Aquariums.Add(new Aquarium {
                    UserId = newUser.Id,
                    MaxFish = 10,
                    MaxObjects = 10,
                    CurrentFish = 0,
                    CurrentObjects = 0,
                    CompletionPercentage = 0
                });

                await _context.SaveChangesAsync();
                await signInManager.SignInAsync(newUser, isPersistent: false);
                return RedirectToAction(nameof(Welcome));
            }

            foreach (var error in result.Errors) {
                ModelState.AddModelError("Register.Password", error.Description);
            }

            ViewData["ActiveAuthView"] = "register";
            return View("Index", model);

        }

        [HttpPost]
        public async Task<IActionResult> Login(AccountViewModel model) {
            LoginViewModel user = model.Login;

            //Ensure That the Register Form Isn't Checked
            ModelState.Remove("Register.UserName");
            ModelState.Remove("Register.Email");
            ModelState.Remove("Register.Password");
            ModelState.Remove("Register.ConfirmPassword");

            if (!ModelState.IsValid) {
                ViewData["ActiveAuthView"] = "login";
                return View("Index", model);
            }

            var foundUser = await userManager.FindByEmailAsync(user.EmailOrUserName);

            if (foundUser == null) {
                foundUser = await userManager.FindByNameAsync(user.EmailOrUserName);
            }

            if (foundUser == null) {
                ModelState.AddModelError("", "UserName/Email or Password is Incorrect");
                ViewData["ActiveAuthView"] = "login";
                return View("Index", model);
            }

            var result = await signInManager.PasswordSignInAsync(foundUser.UserName, user.Password, user.RememberMe, false);

            if (result.Succeeded) {
                var aquariums = _context.Aquariums.Where(a => a.UserId == foundUser.Id).ToList();

                if (aquariums.Count() <= 0) {
                    var aquarium = new Aquarium {
                        UserId = foundUser.Id,
                        MaxFish = 10,
                        MaxObjects = 10,
                        CurrentFish = 0,
                        CurrentObjects = 0,
                        CompletionPercentage = 0
                    };

                    _context.Aquariums.Add(aquarium);
                    await _context.SaveChangesAsync();
                }

                return !foundUser.FirstTimeLogin
                    ? RedirectToAction(nameof(Welcome))
                    : RedirectToAction("Index", "Home");
            } else {
                ModelState.AddModelError("Login.Password", "Email or Password is Incorrect");
                ViewData["ActiveAuthView"] = "login";
                return View("Index", model);
            }

        }

        public async Task<IActionResult> Welcome() {
            if (User.Identity?.IsAuthenticated != true) {
                return RedirectToAction(nameof(Index));
            }

            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            if (user.FirstTimeLogin) {
                return RedirectToAction("Index", "Home");
            }

            ViewData["UserName"] = user.UserName;
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ChooseSetup(bool? setupQuiz) {
            if (User.Identity?.IsAuthenticated != true) {
                return Unauthorized();
            }

            if (setupQuiz == null) {
                return BadRequest("Choose whether to start the setup quiz.");
            }

            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            if (user.FirstTimeLogin) {
                return RedirectToAction("Index", "Home");
            }

            if (setupQuiz.Value) {
                return RedirectToAction(nameof(SetupQuiz));
            }

            user.FirstTimeLogin = true;
            var updateResult = await userManager.UpdateAsync(user);
            if (!updateResult.Succeeded) {
                return BadRequest(string.Join(" ", updateResult.Errors.Select(error => error.Description)));
            }

            return RedirectToAction("Index", "Home");
        }

        public async Task<IActionResult> SetupQuiz() {
            if (User.Identity?.IsAuthenticated != true) {
                return RedirectToAction(nameof(Index));
            }

            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            if (user.FirstTimeLogin) {
                return RedirectToAction("Index", "Home");
            }

            var orderedQuestions = await _context.Questions
                .AsNoTracking()
                .OrderBy(question => question.DisplayOrder)
                .ThenBy(question => question.QuestionId)
                .Take(30)
                .ToListAsync();
            var setupQuestions = orderedQuestions;

            if (setupQuestions.Count == 0) {
                return StatusCode(StatusCodes.Status500InternalServerError, "The setup quiz has no questions configured.");
            }

            var setupQuiz = await _context.Quizzes
                .FirstOrDefaultAsync(quiz => quiz.QuizTitle == Quiz.SetupQuizTitle);
            if (setupQuiz == null) {
                setupQuiz = new Quiz {
                    QuizTitle = Quiz.SetupQuizTitle,
                    CoinRewards = 5
                };
                _context.Quizzes.Add(setupQuiz);
                await _context.SaveChangesAsync();
            }

            await using var transaction = await _context.Database.BeginTransactionAsync();
            await _context.QuizQuestions
                .Where(answer => answer.UserId == user.Id && answer.QuizId == setupQuiz.QuizId)
                .ExecuteDeleteAsync();

            var userQuizQuestions = setupQuestions.Select(question => new QuizQuestion {
                QuizId = setupQuiz.QuizId,
                UserId = user.Id,
                QuestionId = question.QuestionId,
                AnswerValue = 0
            }).ToList();

            _context.QuizQuestions.AddRange(userQuizQuestions);
            await _context.SaveChangesAsync();
            userQuizQuestions = await _context.QuizQuestions
                .AsNoTracking()
                .Where(answer => answer.UserId == user.Id && answer.QuizId == setupQuiz.QuizId)
                .Include(answer => answer.Question)
                .OrderBy(answer => answer.Question!.DisplayOrder)
                .ThenBy(answer => answer.QuestionId)
                .ToListAsync();
            await transaction.CommitAsync();

            ViewData["SetupQuiz"] = true;
            return View("~/Views/Quiz/Question.cshtml", userQuizQuestions);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SkipSetupQuiz() {
            if (User.Identity?.IsAuthenticated != true) {
                return Unauthorized();
            }

            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            if (user.FirstTimeLogin) {
                return RedirectToAction("Index", "Home");
            }

            var questions = await _context.Questions
                .AsNoTracking()
                .OrderBy(question => question.DisplayOrder)
                .ThenBy(question => question.QuestionId)
                .Take(30)
                .ToListAsync();
            if (questions.Count == 0) {
                return StatusCode(StatusCodes.Status500InternalServerError, "The setup quiz has no questions configured.");
            }

            var setupQuiz = await _context.Quizzes
                .FirstOrDefaultAsync(quiz => quiz.QuizTitle == Quiz.SetupQuizTitle);
            if (setupQuiz == null) {
                setupQuiz = new Quiz {
                    QuizTitle = Quiz.SetupQuizTitle,
                    CoinRewards = 5
                };
                _context.Quizzes.Add(setupQuiz);
                await _context.SaveChangesAsync();
            }

            await using (var transaction = await _context.Database.BeginTransactionAsync()) {
                var previousAnswers = await _context.QuizQuestions
                    .Where(answer => answer.UserId == user.Id && answer.QuizId == setupQuiz.QuizId)
                    .ToListAsync();
                _context.QuizQuestions.RemoveRange(previousAnswers);

                _context.QuizQuestions.AddRange(questions.Select(question => new QuizQuestion {
                    QuizId = setupQuiz.QuizId,
                    UserId = user.Id,
                    QuestionId = question.QuestionId,
                    AnswerValue = Random.Shared.Next(1, 6)
                }));
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }

            return await FinishSetupQuiz(completed: true);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> FinishSetupQuiz([FromForm] bool completed) {
            if (User.Identity?.IsAuthenticated != true) {
                return Unauthorized();
            }

            if (!completed) {
                return BadRequest("The setup quiz must be completed before results can be calculated.");
            }

            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            var setupQuiz = await _context.Quizzes
                .AsNoTracking()
                .SingleOrDefaultAsync(quiz => quiz.QuizTitle == Quiz.SetupQuizTitle);
            if (setupQuiz == null) {
                return StatusCode(StatusCodes.Status500InternalServerError, "The setup quiz is not configured.");
            }

            var quizQuestions = await _context.QuizQuestions
                .AsNoTracking()
                .Where(answer => answer.UserId == user.Id && answer.QuizId == setupQuiz.QuizId)
                .Include(answer => answer.Question)
                .ToListAsync();
            if (quizQuestions.Count == 0 || quizQuestions.Any(answer => answer.AnswerValue is < 1 or > 5 || answer.Question == null)) {
                return BadRequest("All setup quiz questions must be answered before results can be calculated.");
            }

            var categoryDefinitions = new (string Name, string[] Tags, Action<UserCategoryValues, int> SetValue)[] {
                ("Sleep", new[] { "Sleep" }, (values, score) => values.Sleep = score),
                ("Hydration", new[] { "Hydration" }, (values, score) => values.Hydration = score),
                ("Fitness", new[] { "Fitness" }, (values, score) => values.Fitness = score),
                ("Learning", new[] { "Learning" }, (values, score) => values.Learning = score),
                ("Organization", new[] { "Organization" }, (values, score) => values.Organization = score),
                ("Mood", new[] { "Mood" }, (values, score) => values.Mood = score),
                ("Nutrition", new[] { "Nutrition", "Nutrition" }, (values, score) => values.Nutrition = score),
                ("Social", new[] { "Social" }, (values, score) => values.Social = score),
                ("Productivity", new[] { "Productivity" }, (values, score) => values.Productivity = score),
                ("Finance", new[] { "Finance" }, (values, score) => values.Finance = score),
                ("Exploration", new[] { "Exploration" }, (values, score) => values.Exploration = score),
                ("Habit", new[] { "Habit" }, (values, score) => values.Habit = score),
                ("Hobby", new[] { "Hobby" }, (values, score) => values.Hobby = score),
                ("Wellness", new[] { "Wellness" }, (values, score) => values.Wellness = score),
                ("Creativity", new[] { "Creativity" }, (values, score) => values.Creativity = score)
            };
            var unknownCategories = quizQuestions
                .Select(answer => answer.Question!.CategoryTag.Trim())
                .Where(tag => !categoryDefinitions.Any(category => category.Tags.Contains(tag, StringComparer.OrdinalIgnoreCase)))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            if (unknownCategories.Count > 0) {
                return StatusCode(StatusCodes.Status500InternalServerError, $"Unsupported setup quiz category: {string.Join(", ", unknownCategories)}.");
            }

            var userCategoryValues = await _context.UserCategoryValues
                .SingleOrDefaultAsync(values => values.UserId == user.Id);
            if (userCategoryValues == null) {
                userCategoryValues = new UserCategoryValues { UserId = user.Id };
                _context.UserCategoryValues.Add(userCategoryValues);
            }

            var results = new List<SetupQuizCategoryProgress>();
            foreach (var category in categoryDefinitions) {
                var categoryAnswers = quizQuestions
                    .Where(answer => category.Tags.Contains(answer.Question!.CategoryTag.Trim(), StringComparer.OrdinalIgnoreCase))
                    .ToList();
                var percentage = categoryAnswers.Count == 0
                    ? 0
                    : (int)Math.Round(categoryAnswers.Sum(answer => answer.AnswerValue) * 100d / (5 * categoryAnswers.Count), MidpointRounding.AwayFromZero);

                category.SetValue(userCategoryValues, percentage);
                if (categoryAnswers.Count > 0) {
                    results.Add(new SetupQuizCategoryProgress { Name = category.Name, Percentage = percentage });
                }
            }

            await using var transaction = await _context.Database.BeginTransactionAsync();
            await _context.SaveChangesAsync();

            user.FirstTimeLogin = true;
            var updateResult = await userManager.UpdateAsync(user);
            if (!updateResult.Succeeded) {
                return BadRequest(string.Join(" ", updateResult.Errors.Select(error => error.Description)));
            }

            await transaction.CommitAsync();

            var strongestCategory = results.OrderByDescending(category => category.Percentage).First();
            var focusCategory = results.OrderBy(category => category.Percentage).First();
            return View("SetupQuizResults", new SetupQuizResultsViewModel {
                Categories = results,
                StrongestCategory = strongestCategory.Name,
                FocusCategory = focusCategory.Name
            });
        }

        [HttpGet]
        public async Task<IActionResult> MyInnerTide(string? from = null) {
            if (User.Identity?.IsAuthenticated != true) {
                return RedirectToAction(nameof(Index));
            }

            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            var values = await _context.UserCategoryValues
                .AsNoTracking()
                .SingleOrDefaultAsync(categoryValues => categoryValues.UserId == user.Id);
            if (values == null) {
                return NotFound("Complete the setup quiz before viewing your Inner Tide results.");
            }
            ViewData["IsMyInnerTidePage"] = true;
            ViewData["InnerTideReturnToQuiz"] = string.Equals(from, "quiz", StringComparison.OrdinalIgnoreCase);
            var changedCategory = TempData["InnerTideChangedCategory"] as string;
            var previousPercentage = TempData["InnerTidePreviousCategoryPercentage"] is int previous
                ? previous
                : (int?)null;

            var categories = new List<SetupQuizCategoryProgress> {
                new() { Name = "Sleep", Percentage = values.Sleep },
                new() { Name = "Hydration", Percentage = values.Hydration },
                new() { Name = "Fitness", Percentage = values.Fitness },
                new() { Name = "Learning", Percentage = values.Learning },
                new() { Name = "Organization", Percentage = values.Organization },
                new() { Name = "Mood", Percentage = values.Mood },
                new() { Name = "Nutrition", Percentage = values.Nutrition },
                new() { Name = "Social", Percentage = values.Social },
                new() { Name = "Productivity", Percentage = values.Productivity },
                new() { Name = "Finance", Percentage = values.Finance },
                new() { Name = "Exploration", Percentage = values.Exploration },
                new() { Name = "Habit", Percentage = values.Habit },
                new() { Name = "Hobby", Percentage = values.Hobby },
                new() { Name = "Wellness", Percentage = values.Wellness },
                new() { Name = "Creativity", Percentage = values.Creativity }
            };

            return View("SetupQuizResults", new SetupQuizResultsViewModel {
                Categories = categories,
                StrongestCategory = categories.OrderByDescending(category => category.Percentage).First().Name,
                FocusCategory = categories.OrderBy(category => category.Percentage).First().Name,
                ChangedCategory = changedCategory,
                PreviousCategoryPercentage = previousPercentage
            });
        }

        public async Task<IActionResult> Logout() {
            await signInManager.SignOutAsync();
            return RedirectToAction("Index", "Home");
        }

        public IActionResult VerifyEmail() {
            return View("VerifyEmail");
        }

        [HttpPost]
        public async Task<IActionResult> VerifyEmail(VerifyEmailViewModel model) {
            if (!ModelState.IsValid) {
                return View("VerifyEmail");
            }

            var user = await userManager.FindByEmailAsync(model.Email);

            if (user == null) {
                ModelState.AddModelError("Verify.Email", "User was not Found");
                return View("VerifyEmail", model);
            } else {
                return RedirectToAction("ChangePassword", "Users", new { email = user.Email} );
            }
        }

        public IActionResult ChangePassword(string email) {
            if (string.IsNullOrEmpty(email)) {
                RedirectToAction("VerifyEmail", "Users");
            }

            return View(new ChangePasswordViewModel { Email = email });
        }

        [HttpPost]
        public async Task<IActionResult> ChangePassword(ChangePasswordViewModel model) {
            if (!ModelState.IsValid) {
                return View("ChangePassword");
            }

            var user = await userManager.FindByEmailAsync(model.Email);

            if (user == null) {
                ModelState.AddModelError(nameof(model.Email), "Email Not Found");
                return View(model);
            }

            if (user != null) {
                var token = await userManager.GeneratePasswordResetTokenAsync(user);

                var result = await userManager.ResetPasswordAsync(
                    user,
                    token,
                    model.NewPassword
                );

                if (!result.Succeeded) {
                    foreach (var error in result.Errors) {
                        ModelState.AddModelError(
                            nameof(model.NewPassword),
                            error.Description
                        );
                    }

                    return View(model);
                }

                return RedirectToAction("Index");

            } else {
                ModelState.AddModelError("ChangePassword.ConfirmNewPassword", "Email Not Found");
                return View(model);
            }
        }

        [HttpPost]
        public async Task<IActionResult> UpdateAccountSettings(AccountSettingsViewModel model) {
            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            model.NewUserName = string.IsNullOrWhiteSpace(model.NewUserName) ? null : model.NewUserName.Trim();
            model.NewEmail = string.IsNullOrWhiteSpace(model.NewEmail) ? null : model.NewEmail.Trim();

            if (!ModelState.IsValid) {
                return AccountSettingsFailure(string.Join(" ", ModelState.Values
                    .SelectMany(value => value.Errors)
                    .Select(error => error.ErrorMessage)));
            }
            var changesUserName = model.NewUserName != null && model.NewUserName != user.UserName;
            var changesEmail = model.NewEmail != null && model.NewEmail != user.Email;

            if (!changesUserName && !changesEmail) {
                return AccountSettingsFailure("Enter at least one new account value.");
            }

            if (!await userManager.CheckPasswordAsync(user, model.CurrentPassword)) {
                return AccountSettingsFailure("Your current password is incorrect.");
            }

            if (changesUserName) {
                var existingUser = await userManager.FindByNameAsync(model.NewUserName!);
                if (existingUser != null && existingUser.Id != user.Id) {
                    return AccountSettingsFailure("That username is already in use.");
                }
            }

            if (changesEmail) {
                var existingUser = await userManager.FindByEmailAsync(model.NewEmail!);
                if (existingUser != null && existingUser.Id != user.Id) {
                    return AccountSettingsFailure("That email address is already in use.");
                }
            }

            if (changesUserName || changesEmail) {
                if (changesUserName) {
                    user.UserName = model.NewUserName;
                }

                if (changesEmail) {
                    user.Email = model.NewEmail;
                    user.EmailConfirmed = false;
                }

                var updateResult = await userManager.UpdateAsync(user);
                if (!updateResult.Succeeded) {
                    return AccountSettingsFailure(string.Join(" ", updateResult.Errors.Select(error => error.Description)));
                }
            }

            await signInManager.RefreshSignInAsync(user);
            TempData["AccountSettingsMessage"] = "Your account settings were updated.";
            TempData["AccountSettingsMessageType"] = "success";
            return RedirectToAction("Index", "Home");
        }

        [HttpGet]
        public async Task<IActionResult> ExportUserData() {
            if (User.Identity?.IsAuthenticated != true) {
                return Unauthorized();
            }

            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            var userId = user.Id;
            var export = new {
                exportedAtUtc = DateTime.UtcNow,
                account = new {
                    user.Id,
                    user.UserName,
                    user.Email,
                    user.PhoneNumber,
                    user.AccountLevel,
                    user.XPForNextLevel,
                    user.CoinCount,
                    user.FirstTimeLogin,
                    user.DailyTaskRegenerationCount,
                    user.DailyLastFreeTaskRefreshAt,
                    user.WeeklyTaskRegenerationCount,
                    user.WeeklyLastFreeTaskRefreshAt,
                    user.MonthlyTaskRegenerationCount,
                    user.MonthlyLastFreeTaskRefreshAt
                },
                journals = await _context.Journals
                    .AsNoTracking()
                    .Where(journal => journal.UserId == userId)
                    .Select(journal => new {
                        journal.JournalId,
                        journal.JournalTitle,
                        journal.JournalContent,
                        journal.JournalCreation
                    })
                    .ToListAsync(),
                aquariums = await _context.Aquariums
                    .AsNoTracking()
                    .Where(aquarium => aquarium.UserId == userId)
                    .Select(aquarium => new {
                        aquarium.AquariumId,
                        aquarium.MaxFish,
                        aquarium.MaxObjects,
                        aquarium.CurrentFish,
                        aquarium.CurrentObjects,
                        aquarium.CompletionPercentage
                    })
                    .ToListAsync(),
                fish = await _context.UserFish
                    .AsNoTracking()
                    .Where(fish => fish.UserId == userId)
                    .Select(fish => new {
                        fish.UserFishId,
                        fish.FishId,
                        fish.AquariumId,
                        fish.IsInAquarium,
                        fish.xCord,
                        fish.yCord
                    })
                    .ToListAsync(),
                items = await _context.UserItems
                    .AsNoTracking()
                    .Where(item => item.UserId == userId)
                    .Select(item => new {
                        item.UserItemId,
                        item.ItemId,
                        item.IsInAquarium
                    })
                    .ToListAsync(),
                tasks = await _context.UserTasks
                    .AsNoTracking()
                    .Where(task => task.UserId == userId)
                    .Select(task => new {
                        task.UserTaskId,
                        task.AssignedAt,
                        task.Completed,
                        task.Priority,
                        task.Multiplier,
                        task.Task!.Title,
                        task.Task.TimeFrame,
                        task.Task.CategoryTag,
                        task.Task.CoinReward
                    })
                    .ToListAsync(),
                quizAnswers = await _context.QuizQuestions
                    .AsNoTracking()
                    .Where(answer => answer.UserId == userId)
                    .Select(answer => new {
                        answer.QuizQuestionId,
                        quizTitle = answer.Quiz!.QuizTitle,
                        question = answer.Question!.QuestionTitle,
                        category = answer.Question.CategoryTag,
                        answer.AnswerValue
                    })
                    .ToListAsync(),
                categoryValues = await _context.UserCategoryValues
                    .AsNoTracking()
                    .Where(values => values.UserId == userId)
                    .Select(values => new {
                        values.Sleep,
                        values.Hydration,
                        values.Fitness,
                        values.Learning,
                        values.Organization,
                        values.Mood,
                        values.Nutrition,
                        values.Social,
                        values.Productivity,
                        values.Finance,
                        values.Exploration,
                        values.Habit,
                        values.Hobby,
                        values.Wellness,
                        values.Creativity
                    })
                    .SingleOrDefaultAsync()
            };

            Response.Headers.CacheControl = "no-store";
            var json = JsonSerializer.SerializeToUtf8Bytes(export, new JsonSerializerOptions(JsonSerializerDefaults.Web) {
                WriteIndented = true
            });
            return File(json, "application/json", $"InnerTide-user-data-{DateTime.UtcNow:yyyyMMdd}.json");
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteUserData([FromForm] string currentPassword) {
            if (User.Identity?.IsAuthenticated != true) {
                return Unauthorized();
            }

            var user = await userManager.GetUserAsync(User);
            if (user == null) {
                return Unauthorized();
            }

            if (string.IsNullOrWhiteSpace(currentPassword) ||
                !await userManager.CheckPasswordAsync(user, currentPassword)) {
                return AccountSettingsFailure("Your current password is required to delete your account data.");
            }

            await using var transaction = await _context.Database.BeginTransactionAsync();
            var userId = user.Id;
            _context.UserTasks.RemoveRange(await _context.UserTasks.Where(task => task.UserId == userId).ToListAsync());
            _context.QuizQuestions.RemoveRange(await _context.QuizQuestions.Where(answer => answer.UserId == userId).ToListAsync());
            _context.Journals.RemoveRange(await _context.Journals.Where(journal => journal.UserId == userId).ToListAsync());
            _context.UserItems.RemoveRange(await _context.UserItems.Where(item => item.UserId == userId).ToListAsync());
            _context.UserFish.RemoveRange(await _context.UserFish.Where(fish => fish.UserId == userId).ToListAsync());
            _context.UserCategoryValues.RemoveRange(
                await _context.UserCategoryValues.Where(values => values.UserId == userId).ToListAsync());
            _context.Aquariums.RemoveRange(await _context.Aquariums.Where(aquarium => aquarium.UserId == userId).ToListAsync());
            await _context.SaveChangesAsync();

            var deleteResult = await userManager.DeleteAsync(user);
            if (!deleteResult.Succeeded) {
                return Conflict(string.Join(" ", deleteResult.Errors.Select(error => error.Description)));
            }

            await transaction.CommitAsync();
            await signInManager.SignOutAsync();
            return RedirectToAction(nameof(Index));
        }

        private IActionResult AccountSettingsFailure(string message) {
            TempData["AccountSettingsMessage"] = message;
            TempData["AccountSettingsMessageType"] = "error";
            return RedirectToAction("Index", "Home");
        }

        [HttpPost]
        public async Task<IActionResult> AddCoins([FromBody] AddCoinModel model) {
            var user = await userManager.GetUserAsync(User);

            if (user == null)
                return Unauthorized();

            user.CoinCount += model.Amount;

            await userManager.UpdateAsync(user);

            return Ok(new { coins = user.CoinCount });
        }

        public async Task<IActionResult> GetCoins() {
            var user = await userManager.GetUserAsync(User);

            if (user == null)
                return Unauthorized();

            int coinCoint = user.CoinCount;

            string coinCountStr = coinCoint.ToString();

            return Json(new {
                coins = user.CoinCount
            });
        }
    }
}
