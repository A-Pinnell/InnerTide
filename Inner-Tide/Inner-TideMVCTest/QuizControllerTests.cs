using Inner_Tide.Controllers;
using Inner_Tide.Data;
using Inner_Tide.Models;
using Inner_Tide.Services;
using Inner_Tide.ViewModels;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Moq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Inner_TideMVCTest {
    [TestClass]
    public class QuizControllerTests {
        private ApplicationDbContext _context;
        private QuizController controller;
        private Mock<UserManager<User>> _userManagerMock;
        private Mock<SignInManager<User>> _signInManagerMock;

        private Mock<UserManager<User>> GetMockUserManager() {
            var store = new Mock<IUserStore<User>>();

            return new Mock<UserManager<User>>(store.Object, null, null, null, null, null, null, null, null);
        }

        private Mock<SignInManager<User>> GetMockSignInManager(UserManager<User> userManager) {
            return new Mock<SignInManager<User>>(userManager, Mock.Of<IHttpContextAccessor>(), Mock.Of<IUserClaimsPrincipalFactory<User>>(), null, null, null, null);
        }

        [TestInitialize]
        public void TestInitialize() {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;

            _context = new ApplicationDbContext(options);
            _userManagerMock = GetMockUserManager();
            _signInManagerMock = GetMockSignInManager(_userManagerMock.Object);
            _userManagerMock
                .Setup(userManager => userManager.GetUserAsync(It.IsAny<ClaimsPrincipal>()))
                .ReturnsAsync(new User { Id = "1", UserName = "TestUser" });

            controller = new QuizController(_context, _userManagerMock.Object);

            controller.ControllerContext = new ControllerContext {
                HttpContext = new DefaultHttpContext {
                    User = new ClaimsPrincipal(new ClaimsIdentity( new[] {
                        new Claim(ClaimTypes.NameIdentifier, "1")
                    }, "TestAuthentication"))
                }
            };
            controller.TempData = new TempDataDictionary(controller.ControllerContext.HttpContext, Mock.Of<ITempDataProvider>());
        }

        #region "Index"
        [TestMethod]
        public async System.Threading.Tasks.Task QuizLoadsIndexView() {
            // Act
            var result = (ViewResult) await controller.Index();

            // Assert
            Assert.AreEqual("Index", result.ViewName);
        }

        [TestMethod]
        public async System.Threading.Tasks.Task QuizIndexOrdersByCategoryProgressAndMarksLowestAsPriority() {
            // Arrange
            _context.Quizzes.AddRange(
                new Quiz { QuizId = 1, QuizTitle = "Hydration", CoinRewards = 10 },
                new Quiz { QuizId = 2, QuizTitle = "Sleep", CoinRewards = 10 },
                new Quiz { QuizId = 3, QuizTitle = Quiz.SetupQuizTitle, CoinRewards = 5 });
            _context.UserCategoryValues.Add(new UserCategoryValues {
                UserId = "1",
                Hydration = 80,
                Sleep = 20
            });
            _context.Questions.AddRange(
                new Question { QuestionId = 1, QuestionTitle = "Hydration question", CategoryTag = "Hydration" },
                new Question { QuestionId = 2, QuestionTitle = "Setup sleep question", CategoryTag = "Sleep" },
                new Question { QuestionId = 3, QuestionTitle = "Answered sleep question", CategoryTag = "Sleep" },
                new Question { QuestionId = 4, QuestionTitle = "Unanswered sleep question", CategoryTag = "Sleep" });
            _context.QuizQuestions.AddRange(
                new QuizQuestion { QuizId = 1, QuestionId = 1, UserId = string.Empty, AnswerValue = 0 },
                new QuizQuestion { QuizId = 2, QuestionId = 2, UserId = string.Empty, AnswerValue = 0 },
                new QuizQuestion { QuizId = 1, QuestionId = 1, UserId = "1", AnswerValue = 4 },
                new QuizQuestion { QuizId = 2, QuestionId = 3, UserId = "1", AnswerValue = 2 },
                new QuizQuestion { QuizId = 3, QuestionId = 2, UserId = "1", AnswerValue = 3 });
            await _context.SaveChangesAsync();

            // Act
            var result = (ViewResult)await controller.Index();
            var model = (QuizMenuViewModel)result.Model;

            // Assert
            Assert.AreEqual(2, model.Quizzes.Count);
            Assert.AreEqual(2, model.Quizzes[0].Quiz.QuizId);
            Assert.AreEqual(20, model.Quizzes[0].CategoryPercentage);
            Assert.AreEqual(50, model.Quizzes[0].ProgressPercentage);
            Assert.AreEqual(2, model.Quizzes[0].QuestionCount);
            Assert.IsFalse(model.Quizzes[0].IsCompleted);
            Assert.IsTrue(model.Quizzes[0].IsPriority);
            Assert.AreEqual(1, model.Quizzes[1].Quiz.QuizId);
            Assert.AreEqual(80, model.Quizzes[1].CategoryPercentage);
            Assert.AreEqual(100, model.Quizzes[1].ProgressPercentage);
            Assert.AreEqual(1, model.Quizzes[1].QuestionCount);
            Assert.IsTrue(model.Quizzes[1].IsCompleted);
            Assert.IsFalse(model.Quizzes[1].IsPriority);
        }

        [TestMethod]
        public async System.Threading.Tasks.Task QuizIndexMovesPriorityToLowestUnlockedCategory() {
            // Arrange
            _context.Quizzes.AddRange(
                new Quiz { QuizId = 1, QuizTitle = "Sleep Quiz", CoinRewards = 10 },
                new Quiz { QuizId = 2, QuizTitle = "Hydration Quiz", CoinRewards = 10 },
                new Quiz { QuizId = 3, QuizTitle = "Wellness Quiz", CoinRewards = 10 });
            _context.UserCategoryValues.Add(new UserCategoryValues {
                UserId = "1",
                Sleep = 10,
                Hydration = 20,
                Wellness = 60
            });
            _context.Questions.AddRange(
                new Question { QuestionId = 1, QuestionTitle = "Sleep question", CategoryTag = "Sleep" },
                new Question { QuestionId = 2, QuestionTitle = "Hydration question", CategoryTag = "Hydration" },
                new Question { QuestionId = 3, QuestionTitle = "Wellness question", CategoryTag = "Wellness" });
            _context.QuizQuestions.Add(
                new QuizQuestion { QuizId = 1, QuestionId = 1, UserId = "1", AnswerValue = 3 });
            await _context.SaveChangesAsync();

            // Act
            var result = (ViewResult)await controller.Index();
            var model = (QuizMenuViewModel)result.Model;

            // Assert
            Assert.AreEqual(1, model.Quizzes[0].Quiz.QuizId);
            Assert.IsTrue(model.Quizzes[0].IsCompleted);
            Assert.IsFalse(model.Quizzes[0].IsPriority);
            Assert.AreEqual(2, model.Quizzes[1].Quiz.QuizId);
            Assert.IsTrue(model.Quizzes[1].IsPriority);
            Assert.IsFalse(model.Quizzes[2].IsPriority);
        }

        [TestMethod]
        public async System.Threading.Tasks.Task QuizIndexSortsCategoriesUsingQuestionDatabase() {
            // Arrange
            _context.Quizzes.AddRange(
                new Quiz { QuizId = 1, QuizTitle = "Wellness Quiz", CoinRewards = 10 },
                new Quiz { QuizId = 2, QuizTitle = "Sleep Quiz", CoinRewards = 10 });
            _context.UserCategoryValues.Add(new UserCategoryValues {
                UserId = "1",
                Wellness = 75,
                Sleep = 15
            });
            _context.Questions.AddRange(
                new Question { QuestionId = 1, QuestionTitle = "Wellness question", CategoryTag = "Wellness" },
                new Question { QuestionId = 2, QuestionTitle = "Sleep question", CategoryTag = "Sleep" });
            await _context.SaveChangesAsync();

            // Act
            var result = (ViewResult)await controller.Index();
            var model = (QuizMenuViewModel)result.Model;

            // Assert
            Assert.AreEqual(2, model.Quizzes.Count);
            Assert.AreEqual("Sleep Quiz", model.Quizzes[0].Quiz.QuizTitle);
            Assert.AreEqual(15, model.Quizzes[0].CategoryPercentage);
            Assert.AreEqual(0, model.Quizzes[0].ProgressPercentage);
            Assert.IsFalse(model.Quizzes[0].IsCompleted);
            Assert.IsTrue(model.Quizzes[0].IsPriority);
            Assert.AreEqual("Wellness Quiz", model.Quizzes[1].Quiz.QuizTitle);
            Assert.AreEqual(75, model.Quizzes[1].CategoryPercentage);
            Assert.AreEqual(0, model.Quizzes[1].ProgressPercentage);
            Assert.IsFalse(model.Quizzes[1].IsCompleted);
            Assert.IsFalse(model.Quizzes[1].IsPriority);
        }

        [TestMethod]
        public async System.Threading.Tasks.Task QuizRedirectsUnauthorizedUser() {
            // Arrange
            controller.ControllerContext = new ControllerContext {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal( new ClaimsIdentity()) }
            };

            //Act
            var result = (RedirectResult) await controller.Index();

            // Assert
            Assert.AreEqual("/Users/Index", (result).Url);
        }
        #endregion


        #region "Question"
        [TestMethod]
        public async System.Threading.Tasks.Task Question_ReturnsQuestionView() {
            // Arrange
            _context.Quizzes.Add(new Quiz { QuizId = 1, QuizTitle = "Sleep Quiz", CoinRewards = 10 });
            _context.Questions.Add(new Question {
                QuestionId = 1,
                QuestionTitle = "How did you sleep?",
                CategoryTag = "Sleep"
            });
            await _context.SaveChangesAsync();

            // Act
            var result = await controller.Question(1);

            // Assert
            var viewResult = result as ViewResult;

            Assert.IsNotNull(viewResult);
            Assert.AreEqual("Question", viewResult.ViewName);
        }

        [TestMethod]
        public async System.Threading.Tasks.Task QuestionOnlyReturnsUnansweredCategoryQuestionsAndPreservesExistingAnswers() {
            // Arrange
            _context.Quizzes.AddRange(
                new Quiz { QuizId = 1, QuizTitle = "Sleep Quiz", CoinRewards = 10 },
                new Quiz { QuizId = 2, QuizTitle = Quiz.SetupQuizTitle, CoinRewards = 10 });
            _context.Questions.AddRange(
                new Question { QuestionId = 1, QuestionTitle = "Setup sleep question", CategoryTag = "Sleep" },
                new Question { QuestionId = 2, QuestionTitle = "Unanswered sleep question", CategoryTag = "Sleep" },
                new Question { QuestionId = 3, QuestionTitle = "Answered sleep question", CategoryTag = "Sleep" },
                new Question { QuestionId = 4, QuestionTitle = "Wellness question", CategoryTag = "Wellness" });
            _context.Questions.AddRange(Enumerable.Range(5, 8)
                .Select(questionId => new Question {
                    QuestionId = questionId,
                    QuestionTitle = $"Unanswered sleep question {questionId}",
                    CategoryTag = "Sleep"
                }));
            _context.QuizQuestions.AddRange(
                new QuizQuestion { QuizId = 2, QuestionId = 1, UserId = "1", AnswerValue = 3 },
                new QuizQuestion { QuizId = 1, QuestionId = 2, UserId = "1", AnswerValue = 0 },
                new QuizQuestion { QuizId = 1, QuestionId = 2, UserId = "1", AnswerValue = 0 },
                new QuizQuestion { QuizId = 1, QuestionId = 3, UserId = "1", AnswerValue = 4 });
            await _context.SaveChangesAsync();

            // Act
            var result = await controller.Question(1);
            var viewResult = result as ViewResult;
            var questions = viewResult?.Model as List<QuizQuestion>;

            // Assert
            Assert.IsNotNull(viewResult);
            Assert.IsNotNull(questions);
            Assert.AreEqual(9, questions.Count);
            Assert.AreEqual(2, questions[0].QuestionId);
            Assert.AreEqual(0, questions[0].AnswerValue);
            Assert.AreEqual(12, questions[^1].QuestionId);
            Assert.AreEqual(12, _context.QuizQuestions.Count());
        }

        [TestMethod]
        public async System.Threading.Tasks.Task SaveAnswerUpdatesCategoryPercentageWhenQuizIsComplete() {
            // Arrange
            _context.Quizzes.AddRange(
                new Quiz { QuizId = 1, QuizTitle = "Sleep Quiz", CoinRewards = 10 },
                new Quiz { QuizId = 2, QuizTitle = Quiz.SetupQuizTitle, CoinRewards = 10 });
            _context.Questions.AddRange(
                new Question { QuestionId = 1, QuestionTitle = "Setup sleep question", CategoryTag = "Sleep" },
                new Question { QuestionId = 2, QuestionTitle = "Quiz sleep question", CategoryTag = "Sleep" });
            _context.UserCategoryValues.Add(new UserCategoryValues { UserId = "1", Sleep = 40, Mood = 30 });
            _context.QuizQuestions.AddRange(
                new QuizQuestion { QuizId = 2, QuestionId = 1, UserId = "1", AnswerValue = 2 },
                new QuizQuestion { QuizId = 1, QuestionId = 2, UserId = "1", AnswerValue = 0 });
            await _context.SaveChangesAsync();
            var quizQuestionId = await _context.QuizQuestions
                .Where(question => question.QuizId == 1)
                .Select(question => question.QuizQuestionId)
                .SingleAsync();

            // Act
            var result = await controller.SaveAnswer(quizQuestionId, 5);

            // Assert
            Assert.IsInstanceOfType(result, typeof(JsonResult));
            var response = JsonSerializer.SerializeToElement(((JsonResult)result).Value);
            Assert.IsTrue(response.GetProperty("completed").GetBoolean());
            Assert.AreEqual(20, response.GetProperty("reward").GetInt32());
            Assert.AreEqual(20, response.GetProperty("coins").GetInt32());
            var values = await _context.UserCategoryValues.SingleAsync();
            Assert.AreEqual(70, values.Sleep);
            Assert.AreEqual(30, values.Mood);
            Assert.AreEqual("Sleep", controller.TempData.Peek("InnerTideChangedCategory"));
            Assert.AreEqual(40, controller.TempData.Peek("InnerTidePreviousCategoryPercentage"));

            var repeatResult = await controller.SaveAnswer(quizQuestionId, 5);
            Assert.IsInstanceOfType(repeatResult, typeof(ConflictObjectResult));
            Assert.AreEqual(20, (await _userManagerMock.Object.GetUserAsync(controller.User))?.CoinCount);
        }

        [TestMethod]
        public async System.Threading.Tasks.Task SaveAnswerUsesBaseRewardForNonPriorityQuiz() {
            // Arrange
            _context.Quizzes.AddRange(
                new Quiz { QuizId = 1, QuizTitle = "Sleep Quiz", CoinRewards = 10 },
                new Quiz { QuizId = 2, QuizTitle = "Hydration Quiz", CoinRewards = 10 });
            _context.Questions.AddRange(
                new Question { QuestionId = 1, QuestionTitle = "Sleep question", CategoryTag = "Sleep" },
                new Question { QuestionId = 2, QuestionTitle = "Hydration question", CategoryTag = "Hydration" });
            _context.UserCategoryValues.Add(new UserCategoryValues { UserId = "1", Sleep = 40, Hydration = 20 });
            _context.QuizQuestions.Add(new QuizQuestion {
                QuizId = 1,
                QuestionId = 1,
                UserId = "1",
                AnswerValue = 0
            });
            await _context.SaveChangesAsync();
            var quizQuestionId = await _context.QuizQuestions
                .Where(question => question.QuizId == 1)
                .Select(question => question.QuizQuestionId)
                .SingleAsync();

            // Act
            var result = await controller.SaveAnswer(quizQuestionId, 5);

            // Assert
            Assert.IsInstanceOfType(result, typeof(JsonResult));
            var response = JsonSerializer.SerializeToElement(((JsonResult)result).Value);
            Assert.IsTrue(response.GetProperty("completed").GetBoolean());
            Assert.AreEqual(10, response.GetProperty("reward").GetInt32());
            Assert.AreEqual(10, response.GetProperty("coins").GetInt32());
        }

        [TestMethod]
        public async System.Threading.Tasks.Task SaveAnswerDoesNotUpdateCategoryUntilQuizIsComplete() {
            // Arrange
            _context.Quizzes.Add(new Quiz { QuizId = 1, QuizTitle = "Sleep Quiz", CoinRewards = 10 });
            _context.Questions.AddRange(
                new Question { QuestionId = 1, QuestionTitle = "First sleep question", CategoryTag = "Sleep" },
                new Question { QuestionId = 2, QuestionTitle = "Second sleep question", CategoryTag = "Sleep" });
            _context.UserCategoryValues.Add(new UserCategoryValues { UserId = "1", Sleep = 40 });
            _context.QuizQuestions.AddRange(
                new QuizQuestion { QuizId = 1, QuestionId = 1, UserId = "1", AnswerValue = 0 },
                new QuizQuestion { QuizId = 1, QuestionId = 2, UserId = "1", AnswerValue = 0 });
            await _context.SaveChangesAsync();
            var quizQuestionId = await _context.QuizQuestions
                .Where(question => question.QuestionId == 1)
                .Select(question => question.QuizQuestionId)
                .SingleAsync();

            // Act
            var result = await controller.SaveAnswer(quizQuestionId, 5);

            // Assert
            Assert.IsInstanceOfType(result, typeof(JsonResult));
            var response = JsonSerializer.SerializeToElement(((JsonResult)result).Value);
            Assert.IsFalse(response.GetProperty("completed").GetBoolean());
            Assert.AreEqual(0, response.GetProperty("reward").GetInt32());
            var values = await _context.UserCategoryValues.SingleAsync();
            Assert.AreEqual(40, values.Sleep);
        }

        [TestMethod]
        public async System.Threading.Tasks.Task SaveAnswerTracksDecreaseFromPreviousCategoryPercentage() {
            // Arrange
            _context.Quizzes.AddRange(
                new Quiz { QuizId = 1, QuizTitle = "Sleep Quiz", CoinRewards = 10 },
                new Quiz { QuizId = 2, QuizTitle = Quiz.SetupQuizTitle, CoinRewards = 10 });
            _context.Questions.AddRange(
                new Question { QuestionId = 1, QuestionTitle = "Setup sleep question", CategoryTag = "Sleep" },
                new Question { QuestionId = 2, QuestionTitle = "Quiz sleep question", CategoryTag = "Sleep" });
            _context.UserCategoryValues.Add(new UserCategoryValues { UserId = "1", Sleep = 90 });
            _context.QuizQuestions.AddRange(
                new QuizQuestion { QuizId = 2, QuestionId = 1, UserId = "1", AnswerValue = 5 },
                new QuizQuestion { QuizId = 1, QuestionId = 2, UserId = "1", AnswerValue = 0 });
            await _context.SaveChangesAsync();
            var quizQuestionId = await _context.QuizQuestions
                .Where(question => question.QuizId == 1)
                .Select(question => question.QuizQuestionId)
                .SingleAsync();

            // Act
            var result = await controller.SaveAnswer(quizQuestionId, 1);

            // Assert
            Assert.IsInstanceOfType(result, typeof(JsonResult));
            Assert.AreEqual(60, (await _context.UserCategoryValues.SingleAsync()).Sleep);
            Assert.AreEqual(90, controller.TempData.Peek("InnerTidePreviousCategoryPercentage"));
        }

        [TestMethod]
        public async System.Threading.Tasks.Task ResetAdditionalQuizQuestionsKeepsSetupAnswersAndRestoresSetupScores() {
            // Arrange
            _context.Quizzes.AddRange(
                new Quiz { QuizId = 1, QuizTitle = Quiz.SetupQuizTitle, CoinRewards = 10 },
                new Quiz { QuizId = 2, QuizTitle = "Sleep Quiz", CoinRewards = 10 });
            _context.Questions.AddRange(
                new Question { QuestionId = 1, QuestionTitle = "Setup sleep question", CategoryTag = "Sleep" },
                new Question { QuestionId = 2, QuestionTitle = "Additional sleep question", CategoryTag = "Sleep" });
            _context.QuizQuestions.AddRange(
                new QuizQuestion { QuizId = 1, QuestionId = 1, UserId = "1", AnswerValue = 1 },
                new QuizQuestion { QuizId = 2, QuestionId = 2, UserId = "1", AnswerValue = 5 });
            _context.UserCategoryValues.Add(new UserCategoryValues { UserId = "1", Sleep = 100, Mood = 50 });
            await _context.SaveChangesAsync();

            var environment = new Mock<IWebHostEnvironment>();
            environment.SetupGet(host => host.EnvironmentName).Returns(Environments.Development);
            var developerController = new DeveloperToolsController(
                _context,
                _userManagerMock.Object,
                new HttpClient(),
                environment.Object,
                new AquariumProgressLimitSettings()) {
                ControllerContext = controller.ControllerContext
            };

            // Act
            var result = await developerController.ResetAdditionalQuizQuestions();

            // Assert
            Assert.IsInstanceOfType(result, typeof(OkObjectResult));
            Assert.AreEqual(1, await _context.QuizQuestions.CountAsync());
            var values = await _context.UserCategoryValues.SingleAsync();
            Assert.AreEqual(20, values.Sleep);
            Assert.AreEqual(0, values.Mood);
        }
        #endregion
    }
}
