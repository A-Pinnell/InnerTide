using Inner_Tide.Controllers;
using Inner_Tide.Data;
using Inner_Tide.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Moq;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;

namespace Inner_TideMVCTest {
    [TestClass]
    public class HomeControllerTests {
        private ApplicationDbContext _context;
        private HomeController controller;

        private Mock<UserManager<User>> _userManagerMock;
        private Mock<SignInManager<User>> _signInManagerMock;

        private Mock<UserManager<User>> GetMockUserManager() {
            var store = new Mock<IUserStore<User>>();

            return new Mock<UserManager<User>>(store.Object, null, null, null,null, null, null, null, null);
        }

        private Mock<SignInManager<User>> GetMockSignInManager(
            UserManager<User> userManager) {

            return new Mock<SignInManager<User>>(userManager, Mock.Of<IHttpContextAccessor>(), Mock.Of<IUserClaimsPrincipalFactory<User>>(), null, null, null, null);
        }

        [TestInitialize]
        public void TestInitialize() {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            _context = new ApplicationDbContext(options);
            _userManagerMock = GetMockUserManager();
            _signInManagerMock = GetMockSignInManager(_userManagerMock.Object);

            // Test User
            var testUser = new User { Id = "1" };

            _userManagerMock.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync(testUser);

            controller = new HomeController(_context, _signInManagerMock.Object, _userManagerMock.Object);

            // Default authenticated user
            controller.ControllerContext = new ControllerContext {
                HttpContext = new DefaultHttpContext {
                    User = new ClaimsPrincipal(
                        new ClaimsIdentity(
                            new[]
                            {
                                new Claim(ClaimTypes.NameIdentifier, testUser.Id)
                            },
                            "TestAuthentication"))
                }
            };
        }

        [TestMethod]
        public async System.Threading.Tasks.Task GetTasksReplacesAssignmentsWithMissingCategoryTags() {
            var now = DateTime.UtcNow;
            _context.UserCategoryValues.Add(new UserCategoryValues { UserId = "1" });

            var requiredCounts = new[] {
                ("Daily", 3),
                ("Weekly", 5),
                ("Monthly", 7)
            };
            foreach (var (timeFrame, count) in requiredCounts) {
                for (var index = 0; index < count; index++) {
                    _context.Tasks.Add(new Inner_Tide.Models.Task {
                        Title = $"{timeFrame} categorized task {index}",
                        TimeFrame = timeFrame,
                        CoinReward = 1,
                        CategoryTag = "Hydration"
                    });
                }
            }

            var legacyTask = new Inner_Tide.Models.Task {
                Title = "Legacy task without a category",
                TimeFrame = "Daily",
                CoinReward = 1,
                CategoryTag = ""
            };
            _context.Tasks.Add(legacyTask);
            _context.UserTasks.Add(new UserTask {
                UserId = "1",
                Task = legacyTask,
                Priority = false,
                Multiplier = 1,
                Completed = false,
                AssignedAt = now
            });
            await _context.SaveChangesAsync();

            var result = await controller.GetTasks();

            Assert.IsInstanceOfType(result, typeof(JsonResult));
            var assignments = await _context.UserTasks
                .Include(userTask => userTask.Task)
                .ToListAsync();
            Assert.AreEqual(15, assignments.Count);
            Assert.IsTrue(assignments.All(userTask => userTask.Task?.CategoryTag == "Hydration"));

            using var json = JsonDocument.Parse(JsonSerializer.Serialize(((JsonResult)result).Value));
            Assert.AreEqual(
                "Hydration",
                json.RootElement.GetProperty("daily")[0].GetProperty("categoryTag").GetString());
        }

        #region Index

        [TestMethod]
        public async System.Threading.Tasks.Task HomeLoadsIndexView() {
            // Act
            var result = await controller.Index() as ViewResult;

            // Assert
            Assert.IsNotNull(result);
            Assert.AreEqual("Index", result.ViewName);
        }

        [TestMethod]
        public async System.Threading.Tasks.Task IndexRedirectsUnauthenticatedUsers() {
            // Arrange
            controller.ControllerContext = new ControllerContext {
                HttpContext = new DefaultHttpContext {
                    User = new ClaimsPrincipal(
                        new ClaimsIdentity())
                }
            };

            // Act
            var result = await controller.Index();

            var redirect = (RedirectResult)result;

            // Assert
            Assert.AreEqual("/Users/Index", redirect.Url);
        }

        [TestMethod]
        public async System.Threading.Tasks.Task IndexReturnsUnauthorizedWhenUserMissing() {
            // Arrange
            _userManagerMock
                .Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>()))
                .ReturnsAsync((User)null);

            // Act
            var result = await controller.Index();

            // Assert
            Assert.IsInstanceOfType(result, typeof(UnauthorizedResult));
        }

        [TestMethod]
        public async System.Threading.Tasks.Task IndexCreatesAquariumWhenUserHasNoAquarium() {
            // Arrange
            var userId = "1";

            _userManagerMock.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync(new User { Id = userId });

            // Act
            await controller.Index();

            // Assert
            Assert.IsNotNull(await _context.Aquariums.CountAsync(a => a.UserId == "1"));
        }

        #endregion

        #region Task regeneration

        [TestMethod]
        public async System.Threading.Tasks.Task RegenerateTasksTracksAndChargesEachPeriodSeparately() {
            var account = new User {
                Id = "1",
                CoinCount = 100,
                DailyTaskRegenerationCount = 9,
                WeeklyTaskRegenerationCount = 4,
                MonthlyTaskRegenerationCount = 5,
                DailyLastFreeTaskRefreshAt = DateTime.UtcNow.AddDays(-2),
                WeeklyLastFreeTaskRefreshAt = DateTime.UtcNow.AddDays(-8),
                MonthlyLastFreeTaskRefreshAt = DateTime.UtcNow.AddMonths(-1).AddDays(-1)
            };
            await SeedTaskRefreshDataAsync(account);

            var dailyResult = (OkObjectResult)await controller.RegenerateTasks("daily");
            var weeklyResult = (OkObjectResult)await controller.RegenerateTasks("weekly");
            var monthlyResult = (OkObjectResult)await controller.RegenerateTasks("monthly");
            var secondDailyResult = (OkObjectResult)await controller.RegenerateTasks("daily");

            Assert.AreEqual(0, GetJsonInt(dailyResult.Value!, "regenerationCost"));
            Assert.AreEqual(0, GetJsonInt(weeklyResult.Value!, "regenerationCost"));
            Assert.AreEqual(0, GetJsonInt(monthlyResult.Value!, "regenerationCost"));
            Assert.AreEqual(2, GetJsonInt(secondDailyResult.Value!, "regenerationCost"));
            Assert.AreEqual(2, account.DailyTaskRegenerationCount);
            Assert.AreEqual(1, account.WeeklyTaskRegenerationCount);
            Assert.AreEqual(1, account.MonthlyTaskRegenerationCount);
            Assert.AreEqual(98, account.CoinCount);
        }

        [TestMethod]
        public async System.Threading.Tasks.Task RegenerateTasksKeepsEachRefreshCountUntilItsOwnIntervalPasses() {
            var now = DateTime.UtcNow;
            var account = new User {
                Id = "1",
                CoinCount = 100,
                DailyTaskRegenerationCount = 1,
                WeeklyTaskRegenerationCount = 2,
                MonthlyTaskRegenerationCount = 3,
                DailyLastFreeTaskRefreshAt = now.AddHours(-12),
                WeeklyLastFreeTaskRefreshAt = now.AddDays(-6),
                MonthlyLastFreeTaskRefreshAt = now.AddMonths(-1).AddDays(1)
            };
            await SeedTaskRefreshDataAsync(account);

            var dailyResult = (OkObjectResult)await controller.RegenerateTasks("daily");
            var weeklyResult = (OkObjectResult)await controller.RegenerateTasks("weekly");
            var monthlyResult = (OkObjectResult)await controller.RegenerateTasks("monthly");

            Assert.AreEqual(2, GetJsonInt(dailyResult.Value!, "regenerationCost"));
            Assert.AreEqual(4, GetJsonInt(weeklyResult.Value!, "regenerationCost"));
            Assert.AreEqual(8, GetJsonInt(monthlyResult.Value!, "regenerationCost"));
            Assert.AreEqual(2, account.DailyTaskRegenerationCount);
            Assert.AreEqual(3, account.WeeklyTaskRegenerationCount);
            Assert.AreEqual(4, account.MonthlyTaskRegenerationCount);
            Assert.AreEqual(86, account.CoinCount);
        }

        [TestMethod]
        public async System.Threading.Tasks.Task RegenerateTasksRejectsUnknownPeriod() {
            var result = await controller.RegenerateTasks("yearly");

            Assert.IsInstanceOfType(result, typeof(BadRequestObjectResult));
        }

        private static int GetJsonInt(object result, string propertyName) {
            using var json = JsonDocument.Parse(JsonSerializer.Serialize(result));
            return json.RootElement.GetProperty(propertyName).GetInt32();
        }

        private async System.Threading.Tasks.Task SeedTaskRefreshDataAsync(User account) {
            _context.Users.Add(account);
            _context.UserCategoryValues.Add(new UserCategoryValues { UserId = account.Id });

            var tasks = new List<Inner_Tide.Models.Task>();
            foreach (var (timeFrame, count) in new[] {
                ("Daily", 6),
                ("Weekly", 10),
                ("Monthly", 14)
            }) {
                for (var index = 0; index < count; index++) {
                    tasks.Add(new Inner_Tide.Models.Task {
                        Title = $"{timeFrame} task {index}",
                        TimeFrame = timeFrame,
                        CoinReward = 1,
                        CategoryTag = "Sleep"
                    });
                }
            }
            _context.Tasks.AddRange(tasks);
            await _context.SaveChangesAsync();
        }

        #endregion

        #region Privacy

        [TestMethod]
        public void PrivacyLoadsIndexView() {
            // Act
            var result = (ViewResult)controller.Privacy();

            // Assert
            Assert.AreEqual("Privacy", result.ViewName);
        }

        #endregion
    }
}