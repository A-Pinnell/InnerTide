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

            new ApplicationDbContext(options);

            controller = new TasksController(_context);

            controller.ControllerContext = new ControllerContext {
                HttpContext = new DefaultHttpContext {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[] {
                        new Claim(ClaimTypes.NameIdentifier, "1")
                    }, "TestAuthentication"))
                }
            };
        }

        #region "Index"
        [TestMethod]
        public void TaskLoadsIndexView(string categoryString) {
            // Act
            var result = (ViewResult)controller.Index("Sleep");

            // Assert
            Assert.AreEqual("Index", result.ViewName);
        }

        [TestMethod]
        public void TaskRedirectUnauthorizedUser() {
            // Arrange
            controller.ControllerContext = new ControllerContext {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity()) }
            };

            //Act
            var result = controller.Index("Sleep");

            // Assert
            Assert.AreEqual("/Users/Index", ((RedirectResult)result).Url);
        }
        #endregion
    }


}

