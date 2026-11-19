using Inner_Tide.Controllers;
using Inner_Tide.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace Inner_TideMVCTest {
    [TestClass]
    public class TaskControllerTests {
        private ApplicationDbContext _context;
        private TasksController controller;

        [TestInitialize]
        public void TestInitialize() {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;

            _context = new ApplicationDbContext(options);

            controller = new TasksController(_context);

            _context.Tasks.Add(new Inner_Tide.Models.Task { TaskId = 1, Title = "Test Task 1", TimeFrame = "Daily", CoinReward = 5, CategoryTag = "Sleep" });
            _context.Tasks.Add(new Inner_Tide.Models.Task { TaskId = 2, Title = "Test Task 2", TimeFrame = "Weekly", CoinReward = 10, CategoryTag = "Sleep" });
            _context.Tasks.Add(new Inner_Tide.Models.Task { TaskId = 3, Title = "Test Task 3", TimeFrame = "Montly", CoinReward = 15, CategoryTag = "Sleep" });

            _context.SaveChanges();

            controller.ControllerContext = new ControllerContext {
                HttpContext = new DefaultHttpContext {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[] {
                        new Claim(ClaimTypes.NameIdentifier, "1")
                    }, "TestAuthentication"))
                }
            };
       }

        #region "Index"
        #region "GET"
        [TestMethod]
        public void IndexGetLoadsView() {
            // Act
            var result = (ViewResult)controller.Index("Sleep");

            // Assert
            Assert.AreEqual("Index", result.ViewName);
        }

        [TestMethod]
        public void IndexGetRedirectUnauthorizedUser() {
            // Arrange
            controller.ControllerContext = new ControllerContext {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity()) }
            };

            //Act
            var result = controller.Index("Sleep");

            // Assert
            Assert.AreEqual("/Users/Index", ((RedirectResult)result).Url);
        }

        [TestMethod]
        public void IndexGetLoadsTasks() {
            //Act
            var result = (ViewResult)controller.Index("Sleep");

            var tasks = _context.Tasks.Where(t => t.CategoryTag == "Sleep").OrderBy(t => t.Title).ToList();

            //Assert
            CollectionAssert.AreEqual(tasks, (List<Inner_Tide.Models.Task>)result.Model);
        }
        #endregion
        #endregion

        #region "Create"
        #region "GET"
        [TestMethod]
        public void CreateGetLoadsView() {
            //Act
            var result = (ViewResult)controller.Create();

            //Assert
            Assert.AreEqual("Create", result.ViewName);
        }
        #endregion

        #region "POST"
        [TestMethod]
        public void CreatePostInvalidEntryRedirectsToCreate() {
            var task = new Inner_Tide.Models.Task { Title = "Test Task 4", TimeFrame = "Daily", CoinReward = 5, CategoryTag = "Sleep"};
            controller.ModelState.AddModelError("Task", "Title");

            //Act
            var result = (ViewResult)controller.Create(task);

            //Assert
            Assert.AreEqual("Create", result.ViewName);

        }

        [TestMethod]
        public void CreatePostValidEntryCreatesTask() {
            var task = new Inner_Tide.Models.Task { Title = "Test Task 4", TimeFrame = "Daily", CoinReward = 5, CategoryTag = "Sleep" };

            //Act
            var result = (RedirectToActionResult)controller.Create(task);
            var tasks = _context.Tasks.OrderBy(t => t.Title).Where(t => t.TaskId == 4).ToList();

            //Assert
            Assert.AreEqual(tasks[0], task);
        }

        [TestMethod]
        public void CreatePostValidEntryRedirectsToIndex() {
            var task = new Inner_Tide.Models.Task { Title = "Test Task 4", TimeFrame = "Daily", CoinReward = 5, CategoryTag = "Sleep" };

            //Act
            var result = (RedirectToActionResult)controller.Create(task);

            //Assert
            Assert.AreEqual("Index", result.ActionName);
        }
        #endregion
        #endregion

        #region "Update"
        #region "GET"
        [TestMethod]
        public void UpdateGetReturnsView() {
            //Act
            var result = (ViewResult)controller.Update(1);

            //Assert
            Assert.AreEqual("Update", result.ViewName);
        }

        [TestMethod]
        public void UpdateGetInvalidIdReturnsNotFound() {
            //Act
            var result = (NotFoundResult)controller.Update(-1);

            //Assert
            Assert.IsInstanceOfType(result, typeof(NotFoundResult));
        }

        [TestMethod]
        public void UpdateGetValidIdReturnsValue() {
            //Act
            var results = (ViewResult)controller.Update(1);

            var task = _context.Tasks.Where(t => t.TaskId == 1).ToList();

            //Assert
            Assert.AreEqual(task[0], results.Model);
        }
        #endregion

        #region "POST"
        [TestMethod]
        public void UpdatePostInvalidModelStateReturnsUpdateView() {
            var task = new Inner_Tide.Models.Task { TaskId = 4, Title = "Test Task 4", TimeFrame = "Weekly", CoinReward = 5, CategoryTag = "Sleep" };
            controller.ModelState.AddModelError("Task", "Title");

            //Act
            var result = (ViewResult)controller.Update(4, task);

            //Assert
            Assert.AreEqual("Update", result.ViewName);
        }

        [TestMethod]
        public void UpdatePostValidModelReturnsIndexView() {
            var task = new Inner_Tide.Models.Task { Title = "Test Task 3", TimeFrame = "Weekly", CoinReward = 5, CategoryTag = "Sleep" };

            //Act
            var result = (RedirectToActionResult)controller.Update(3, task);

            //Assert
            Assert.AreEqual("Index", result.ActionName);
        }
        #endregion
        #endregion

        #region "Delete"
        [TestMethod]
        public void DeleteLoadsInvalidIdReturnsNotFound() {
            //Act
            var result = (NotFoundResult)controller.Delete(-1);

            //Assert
            Assert.IsInstanceOfType(result, typeof(NotFoundResult));
        }

        [TestMethod]
        public void DeleteValidIdDeletesEntry() {
            //Act
            var results = (RedirectToActionResult)controller.Delete(1);

            var task = _context.Tasks.Find(1);

            //Assert
            Assert.AreEqual(null, task);
        }

        [TestMethod]
        public void DeleteValidIdRedirectsToIndex() {
            //Act
            var results = (RedirectToActionResult)controller.Delete(1);

            //Assert
            Assert.AreEqual("Index", results.ActionName);
        }
        #endregion
    }


}

