using Inner_Tide.Controllers;
using Inner_Tide.Data;
using Inner_Tide.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Moq;
using System;
using System.Collections.Generic;
using System.Security.Claims;
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