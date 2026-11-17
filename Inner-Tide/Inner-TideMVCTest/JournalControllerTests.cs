using Inner_Tide.Controllers;
using Inner_Tide.Data;
using Inner_Tide.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.EntityFrameworkCore;
using Moq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using static Inner_Tide.Controllers.JournalsController;
using static Microsoft.ApplicationInsights.MetricDimensionNames.TelemetryContext;

namespace Inner_TideMVCTest {
    [TestClass]
    public class JournalControllerTests {
        private ApplicationDbContext _context;
        private JournalsController controller;
        private HttpClient _httpClient;
        private Mock<UserManager<Inner_Tide.Models.User>> _userManagerMock;

        private Mock<UserManager<Inner_Tide.Models.User>> GetMockUserManager() {
            var store = new Mock<IUserStore<Inner_Tide.Models.User>>();

            return new Mock<UserManager<Inner_Tide.Models.User>>(store.Object, null, null, null, null, null, null, null, null);
        }

        [TestInitialize]
        public void TestInitialize() {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;

            _context = new ApplicationDbContext(options);
            _userManagerMock = GetMockUserManager();
            _userManagerMock
                .Setup(userManager => userManager.GetUserAsync(It.IsAny<ClaimsPrincipal>()))
                .ReturnsAsync(new Inner_Tide.Models.User { Id = "1", UserName = "TestUser" });

            controller = new JournalsController(_context, _userManagerMock.Object, _httpClient);

            controller.ControllerContext = new ControllerContext {
                HttpContext = new DefaultHttpContext {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[] {
                        new Claim(ClaimTypes.NameIdentifier, "1")
                    }, "TestAuthentication"))
                }
            };
            controller.TempData = new TempDataDictionary(controller.ControllerContext.HttpContext, Mock.Of<ITempDataProvider>());
        }

        #region "Index"
        [TestMethod]
        public void JournalLoadsIndexView() {
            // Act
            var result = (ViewResult)controller.Index();

            // Assert
            Assert.AreEqual("Index", result.ViewName);
        }

        #region "GET Journals"
        [TestMethod]
        public async System.Threading.Tasks.Task GetAllJournalEntriesReturnsUnauthorized() {
            _userManagerMock.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync((Inner_Tide.Models.User)null);

            // Act
            var result = await controller.GetAllJournalEntries();

            //Assert
            Assert.IsInstanceOfType(result, typeof(UnauthorizedResult));
        }

        [TestMethod]
        public async System.Threading.Tasks.Task GetAllJournalEntriesReturnsJournals() {
            var user = new Inner_Tide.Models.User {
                Id = "1",
                UserName = "Test",
                Email = "test@test.com",
                FirstTimeLogin = true
            };

            _context.Journals.AddRange(
                new Journal { JournalId = 1, JournalTitle = "Tes", JournalContent = "Test", JournalCreation = DateTime.Now, UserId = "1" },
                new Journal { JournalId = 2, JournalTitle = "Tes", JournalContent = "Test", JournalCreation = DateTime.Now, UserId = "1" },
                new Journal { JournalId = 3, JournalTitle = "Tes", JournalContent = "Test", JournalCreation = DateTime.Now, UserId = "1" }
            );

            await _context.SaveChangesAsync();

            _userManagerMock.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync(user);

            //Act
            var result = await controller.GetAllJournalEntries();
            var JSONResult = result as JsonResult;
            var journals = JSONResult.Value as IEnumerable<Journal>;

            //Assert
            Assert.AreEqual(3, journals.Count());
        }
        #endregion

        #region "GET Journal"
        [TestMethod]
        public async System.Threading.Tasks.Task GetJournalEntryReturnsUnauthorized() {
            _context.Add(new Journal { JournalId = 1, JournalTitle = "Test", JournalContent = "Test", JournalCreation = DateTime.Now, UserId = "1" } );
            await _context.SaveChangesAsync();

            var user = new Inner_Tide.Models.User {
                Id = "1",
                UserName = "Test",
                Email = "test@test.com",
                FirstTimeLogin = true
            };

            _userManagerMock.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync((Inner_Tide.Models.User)null);

            // Act
            var result = await controller.GetJournalEntry(1);

            //Assert
            Assert.IsInstanceOfType(result, typeof(UnauthorizedResult));
        }

        [TestMethod]
        public async System.Threading.Tasks.Task GetJournalEntryReturnsValidEntry() {
            var user = new Inner_Tide.Models.User {
                Id = "1",
                UserName = "Test",
                Email = "test@test.com",
                FirstTimeLogin = true
            };

            var journal = new Journal {
                JournalId = 1,
                JournalTitle = "Test",
                JournalContent = "Test",
                JournalCreation = DateTime.Now,
                UserId = "1"
            };

            _context.Add(journal);
            await _context.SaveChangesAsync();

            _userManagerMock.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync(user);

            // Act
            var result = await controller.GetJournalEntry(1);
            var JsonResult = result as JsonResult;
            var journalResult = JsonResult.Value as Journal;

            //Assert
            Assert.AreEqual(journal, journalResult as Journal);
        }

        [TestMethod]
        public async System.Threading.Tasks.Task GetJournalEntryReturnsNotFoundOnInvalidEntry() {
            var user = new Inner_Tide.Models.User {
                Id = "1",
                UserName = "Test",
                Email = "test@test.com",
                FirstTimeLogin = true
            };

            var journal = new Journal {
                JournalId = 1,
                JournalTitle = "Test",
                JournalContent = "Test",
                JournalCreation = DateTime.Now,
                UserId = "1"
            };

            _context.Add(journal);
            await _context.SaveChangesAsync();

            _userManagerMock.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync(user);

            // Act
            var result = await controller.GetJournalEntry(2);

            //Assert
            Assert.IsInstanceOfType(result, typeof(NotFound));
        }
        #endregion
        #endregion

        #region "Create"
        #region "GET"
        [TestMethod]
        public void JournalLoadsCreateView() {
            //Act
            var result = (ViewResult)controller.Create();

            // Assert
            Assert.AreEqual("Create", result.ViewName);
        }
        #endregion

        #region "POST"

        [TestMethod]
        public async System.Threading.Tasks.Task JournalCreatePostInvalidEntry() {
            var journal = new Journal {
                JournalId = 1,
                JournalTitle = "Test Journal",
                JournalContent = "Test Journal",
                JournalCreation = DateTime.Now,
            };

            controller.ModelState.AddModelError(nameof(Journal.JournalTitle), "Journal title is required");

            // Act
            var result = await controller.Create(journal);

            // Assert
            Assert.IsNotNull(result);
            Assert.AreEqual("Create", (result as ViewResult).ViewName);
        }

        [TestMethod]
        public async System.Threading.Tasks.Task JournalCreatePostValidEntry() {
            var journal = new Journal { 
                JournalId = 1,
                JournalTitle = "Test Journal",
                JournalContent = "This is a Test Journal for Testing Purposes",
                JournalCreation = DateTime.Now,
            };

            // Act
            var result = await controller.Create(journal) as RedirectToActionResult;
            var journals = _context.Journals.OrderBy(j => j.JournalId).Where(j => j.JournalId == 1).ToList();

            // Assert
            Assert.AreEqual(journals[0], journal);

        }

        [TestMethod]
        public async System.Threading.Tasks.Task JournalCreatePostValidEntryRedirects() {
            var journal = new Journal {
                JournalId = 1,
                JournalTitle = "Test Journal",
                JournalContent = "This is a Test Journal for Testing Purposes",
                JournalCreation = DateTime.Now,
            };

            // Act
            var result = await controller.Create(journal) as RedirectToActionResult;

            // Assert
            Assert.AreEqual("Index", result.ActionName);
        }
        #endregion
        #endregion

        #region "Delete"
        [TestMethod]
        public async System.Threading.Tasks.Task DeleteReturnsUnauthorizedWhenUserIsNull() {
            var deleteRequest = new DeleteJournalRequest {
                JournalId = 1
            };

            _userManagerMock.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync((Inner_Tide.Models.User)null);

            // Act
            var result = await controller.Delete(deleteRequest);

            //Assert
            Assert.IsInstanceOfType(result, typeof(UnauthorizedResult));
        }

        [TestMethod]
        public async System.Threading.Tasks.Task DeleteValidEntry() {
            var user = new Inner_Tide.Models.User {
                Id = "1",
                UserName = "Test",
                Email = "test@test.com",
                FirstTimeLogin = true
            };

            var journal = new Journal {
                JournalId = 1,
                JournalTitle = "Test",
                JournalContent = "Test",
                JournalCreation = DateTime.Now,
                UserId = "1"
            };

            var deleteRequest = new DeleteJournalRequest {
                JournalId = 1
            };

            _context.Add(journal);
            await _context.SaveChangesAsync();

            _userManagerMock.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync(user);

            //Act
            var result = await controller.Delete(deleteRequest);
            var journalFetch = _context.Journals.Where(j => j.JournalId == 1 && j.UserId == user.Id).ToList();

            //Assert
            Assert.AreEqual(0, journalFetch.Count());
        }

        [TestMethod]
        public async System.Threading.Tasks.Task DeleteInvalidEntryReturnsNotFound() {
            var user = new Inner_Tide.Models.User {
                Id = "1",
                UserName = "Test",
                Email = "test@test.com",
                FirstTimeLogin = true
            };

            var journal = new Journal {
                JournalId = 1,
                JournalTitle = "Test",
                JournalContent = "Test",
                JournalCreation = DateTime.Now,
                UserId = "1"
            };

            var deleteRequest = new DeleteJournalRequest {
                JournalId = 2
            };

            _context.Add(journal);
            await _context.SaveChangesAsync();

            _userManagerMock.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync(user);

            //Act
            var result = await controller.Delete(deleteRequest);

            //Assert
            Assert.IsInstanceOfType(result, typeof(NotFoundResult));
        }

        [TestMethod]
        public async System.Threading.Tasks.Task DeleteValidEntryRedirectsToIndex() {
            var user = new Inner_Tide.Models.User {
                Id = "1",
                UserName = "Test",
                Email = "test@test.com",
                FirstTimeLogin = true
            };

            var journal = new Journal {
                JournalId = 1,
                JournalTitle = "Test",
                JournalContent = "Test",
                JournalCreation = DateTime.Now,
                UserId = "1"
            };

            var deleteRequest = new DeleteJournalRequest {
                JournalId = 1
            };

            _context.Add(journal);
            await _context.SaveChangesAsync();

            _userManagerMock.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync(user);

            //Act
            var result = await controller.Delete(deleteRequest) as RedirectToActionResult;

            //Assert
            Assert.AreEqual("Index", result.ActionName);
        }
        #endregion
    }
}
