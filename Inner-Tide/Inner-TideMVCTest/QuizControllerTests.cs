using Inner_Tide.Controllers;
using Inner_Tide.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace Inner_TideMVCTest {
    [TestClass]
    public class QuizControllerTests {
        private ApplicationDbContext _context;
        private QuizController controller;

        [TestInitialize]
        public void TestInitialize() {
            controller = new QuizController();

            controller.ControllerContext = new ControllerContext {
                HttpContext = new DefaultHttpContext {
                    User = new ClaimsPrincipal(new ClaimsIdentity( new[] {
                        new Claim(ClaimTypes.NameIdentifier, "1")
                    }, "TestAuthentication"))
                }
            };
        }

        #region "Index"
        [TestMethod]
        public void QuizLoadsIndexView() {
            // Act
            var result = (ViewResult)controller.Index();

            // Assert
            Assert.AreEqual("Index", result.ViewName);
        }

        [TestMethod]
        public void QuizRedirectsUnauthorizedUser() {
            // Arrange
            controller.ControllerContext = new ControllerContext {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal( new ClaimsIdentity()) }
            };

            //Act
            var result = controller.Index();

            // Assert
            Assert.AreEqual("/Users/Index", ((RedirectResult)result).Url);
        }
        #endregion


        #region "Question"
        [TestMethod]
        public void QuizReturnsQuestion () {
            // Act
            var result = (ViewResult) controller.Question();

            // Assert
            Assert.AreEqual("Question", result.ViewName);
        }
        #endregion
    }
}
