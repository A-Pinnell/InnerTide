using Inner_Tide.Controllers;
using Inner_Tide.Data;
using Inner_Tide.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Moq;
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

            controller = new QuizController(_context, _userManagerMock.Object);

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
        public async System.Threading.Tasks.Task QuizLoadsIndexView() {
            // Act
            var result = (ViewResult) await controller.Index();

            // Assert
            Assert.AreEqual("Index", result.ViewName);
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
            // Act
            var result = await controller.Question(1);

            // Assert
            var viewResult = result as ViewResult;

            Assert.IsNotNull(viewResult);
            Assert.AreEqual("Question", viewResult.ViewName);
        }
        #endregion
    }
}
