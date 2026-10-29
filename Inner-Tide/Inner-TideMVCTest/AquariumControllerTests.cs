using Inner_Tide.Controllers;
using Inner_Tide.Data;
using Inner_Tide.Models;
using Inner_Tide.Services;
using Inner_Tide.ViewModels;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Runtime;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace Inner_TideMVCTest {
    [TestClass]
    public class AquariumControllerTests {
        private ApplicationDbContext _context;
        private AquariumController controller;
        private HttpClient _httpClient;
        private Mock<ILogger<AquariumController>> _loggerMock;
        private Mock<UserManager<User>> _userManagerMock;
        private Mock<SignInManager<User>> _signInManagerMock;
        private AquariumProgressLimitSettings _progressLimitSettings;

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
            _loggerMock = new Mock<ILogger<AquariumController>>();
            _httpClient = new HttpClient();
            _progressLimitSettings = new AquariumProgressLimitSettings();

            var testUser = new User { Id = "1", UserName = "TestUser", Email = "test@test.com", CoinCount = 0 };

            _userManagerMock.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync(testUser);

            controller = new AquariumController(_context, _signInManagerMock.Object, _userManagerMock.Object, _httpClient, _loggerMock.Object, _progressLimitSettings);

            controller.ControllerContext = new ControllerContext {
                HttpContext = new DefaultHttpContext {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[] {
                                new Claim(ClaimTypes.NameIdentifier, testUser.Id)
                            }, "TestAuthentication"))
                }
            };
        }

        #region "Index"

        [TestMethod]
        public async System.Threading.Tasks.Task AquariumLoadsIndexView() {
            //Act
            var result = (ViewResult) await controller.Index();

            //Assert
            Assert.AreEqual("Index", result.ViewName);
        }

        [TestMethod]
        public async System.Threading.Tasks.Task AquariumRedirectsUnauthorizedUser() {
            // Arrange
            controller.ControllerContext = new ControllerContext {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity()) }
            };

            //Act 
            var result = (RedirectResult) await controller.Index();

            //Assert
            Assert.AreEqual("/Users/Index", ((RedirectResult)result).Url);
        }

        [TestMethod]
        public async System.Threading.Tasks.Task AquariumReturnsUnauthorizedWhenCurrentUserIsNull() {
            // Arrange
            _userManagerMock.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync((User)null);

            // Act
            var result = await controller.Index();

            // Assert
            Assert.IsInstanceOfType(result, typeof(UnauthorizedResult));
        }

        #endregion
    }
}
