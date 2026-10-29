using Inner_Tide.Controllers;
using Inner_Tide.Data;
using Inner_Tide.Models;
using Inner_Tide.ViewModels;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Moq;
using System.Security.Claims;

namespace Inner_TideMVCTest {
    [TestClass]
    public class UsersControllerTests {
        private ApplicationDbContext _context;
        private UsersController controller;

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

            var testUser = new User { Id = "1", UserName = "TestUser", Email = "test@test.com", CoinCount = 0};

            _userManagerMock.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync(testUser);

            controller = new UsersController(_signInManagerMock.Object, _userManagerMock.Object, _context);

            controller.ControllerContext = new ControllerContext {
                HttpContext = new DefaultHttpContext {
                    User = new ClaimsPrincipal( new ClaimsIdentity( new[] {
                                new Claim(ClaimTypes.NameIdentifier, testUser.Id)
                            }, "TestAuthentication"))
                }
            };
        }

        #region Index

        [TestMethod]
        public void UserLoadsIndexView() {
            //Act
            var result = (ViewResult)controller.Index();

            //Assert
            Assert.AreEqual(typeof(AccountViewModel), result.Model.GetType());
        }

        #endregion

        #region "Register"

        [TestMethod]
        public async System.Threading.Tasks.Task RegisterReturnsIndexWhenModelStateInvalid() {
            // Arrange
            controller.ModelState.AddModelError("Test", "Error");

            var model = new AccountViewModel {
                Register = new RegisterViewModel()
            };

            // Act
            var result = (ViewResult)await controller.Register(model);

            // Assert
            Assert.AreEqual("Index", result.ViewName);
        }

        [TestMethod]
        public async System.Threading.Tasks.Task RegisterRedirectsWhenCreateSucceeds() {
            // Arrange
            _userManagerMock.Setup(x => x.CreateAsync(It.IsAny<User>(), It.IsAny<string>())).ReturnsAsync(IdentityResult.Success);

            var model = new AccountViewModel {
                Register = new RegisterViewModel {
                    UserName = "TestUser",
                    Email = "test@test.com",
                    Password = "Test1234!"
                }
            };

            // Act
            var result = (RedirectToActionResult)await controller.Register(model);

            // Assert
            Assert.AreEqual("Index", result.ActionName);
        }

        [TestMethod]
        public async System.Threading.Tasks.Task RegisterReturnsIndexWhenCreateFails() {
            // Arrange
            _userManagerMock.Setup(x => x.CreateAsync(It.IsAny<User>(), It.IsAny<string>()))
                            .ReturnsAsync(IdentityResult.Failed(new IdentityError { Description = "Username already exists" }));

            var model = new AccountViewModel {
                Register = new RegisterViewModel {
                    UserName = "TestUser",
                    Email = "test@test.com",
                    Password = "Test1234!"
                }
            };

            // Act
            var result = (ViewResult)await controller.Register(model);

            // Assert
            Assert.AreEqual("Index", result.ViewName);
        }
        #endregion

        #region "Login"
        [TestMethod]
        public async System.Threading.Tasks.Task LoginReturnsIndexWhenModelStateInvalid() {
            // Arrange
            controller.ModelState.AddModelError("Test", "Error");

            var model = new AccountViewModel {
                Login = new LoginViewModel()
            };

            // Act
            var result = (ViewResult)await controller.Login(model);

            // Assert
            Assert.AreEqual("Index", result.ViewName);
        }

        [TestMethod]
        public async System.Threading.Tasks.Task LoginReturnsIndexWhenUserNotFound() {
            // Arrange
            _userManagerMock.Setup(x => x.FindByEmailAsync(It.IsAny<string>())).ReturnsAsync((User)null);

            var model = new AccountViewModel {
                Login = new LoginViewModel {
                    Email = "missing@test.com",
                    Password = "Password123!"
                }
            };

            // Act
            var result = (ViewResult)await controller.Login(model);

            // Assert
            Assert.AreEqual("Index", result.ViewName);
        }


        [TestMethod]
        public async System.Threading.Tasks.Task LoginReturnsIndexWhenSignInFails() {
            // Arrange
            var user = new User {
                Id = "1",
                UserName = "Test",
                Email = "test@test.com"
            };

            _userManagerMock.Setup(x => x.FindByEmailAsync(It.IsAny<string>())).ReturnsAsync(user);

            _signInManagerMock.Setup(x => x.PasswordSignInAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<bool>(),
                    false)).ReturnsAsync(Microsoft.AspNetCore.Identity.SignInResult.Failed);

            var model = new AccountViewModel {
                Login = new LoginViewModel {
                    Email = user.Email,
                    Password = "WrongPassword"
                }
            };

            // Act
            var result = (ViewResult)await controller.Login(model);

            // Assert
            Assert.AreEqual("Index", result.ViewName);
        }

        [TestMethod]
        public async System.Threading.Tasks.Task LoginReturnsUnauthorizedWhenUserDataMissing() {
            // Arrange
            var user = new User {
                Id = "1",
                UserName = "Test",
                Email = "test@test.com"
            };

            _userManagerMock.Setup(x => x.FindByEmailAsync(It.IsAny<string>())).ReturnsAsync(user);

            _signInManagerMock.Setup(x => x.PasswordSignInAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<bool>(),
                    false)).ReturnsAsync(Microsoft.AspNetCore.Identity.SignInResult.Success);

            _userManagerMock.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync((User)null);

            var model = new AccountViewModel {
                Login = new LoginViewModel {
                    Email = user.Email,
                    Password = "Password123!"
                }
            };

            // Act
            var result = await controller.Login(model);

            // Assert
            Assert.IsInstanceOfType(result, typeof(UnauthorizedResult));
        }

        [TestMethod]
        public async System.Threading.Tasks.Task LoginRedirectsHomeWhenSuccessful() {
            // Arrange
            var user = new User {
                Id = "1",
                UserName = "Test",
                Email = "test@test.com"
            };

            _userManagerMock.Setup(x => x.FindByEmailAsync(It.IsAny<string>())).ReturnsAsync(user);

            _userManagerMock.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync(user);

            _signInManagerMock.Setup(x => x.PasswordSignInAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<bool>(),
                    false)).ReturnsAsync(Microsoft.AspNetCore.Identity.SignInResult.Success);

            var model = new AccountViewModel {
                Login = new LoginViewModel {
                    Email = user.Email,
                    Password = "Password123!"
                }
            };

            // Act
            var result = (RedirectToActionResult)await controller.Login(model);

            // Assert
            Assert.AreEqual("Index", result.ActionName);
        }

        [TestMethod]
        public async System.Threading.Tasks.Task LoginCreatesAquariumWhenUserHasNone() {
            // Arrange
            var user = new User {
                Id = "1",
                UserName = "Test",
                Email = "test@test.com"
            };

            _userManagerMock.Setup(x => x.FindByEmailAsync(It.IsAny<string>())).ReturnsAsync(user);
            _userManagerMock.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync(user);

            _signInManagerMock.Setup(x => x.PasswordSignInAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<bool>(),
                    false)).ReturnsAsync(Microsoft.AspNetCore.Identity.SignInResult.Success);

            var model = new AccountViewModel {
                Login = new LoginViewModel {
                    Email = user.Email,
                    Password = "Password123!"
                }
            };

            // Act
            await controller.Login(model);

            // Assert
            Assert.AreEqual(1, _context.Aquariums.Count(a => a.UserId == user.Id));
        }

        #endregion

        #region Logout

        [TestMethod]
        public async System.Threading.Tasks.Task LogoutRedirectsHome() {
            //Act
            var result = (RedirectToActionResult) await controller.Logout();

            //Assert
            Assert.AreEqual("Index", result.ActionName);
        }

        #endregion

        #region VerifyEmail

        [TestMethod]
        public void VerifyEmailLoadsVerifyEmailView() {
            //Act
            var result = (ViewResult)controller.VerifyEmail();

            //Assert
            Assert.AreEqual("VerifyEmail", result.ViewName);
        }

        [TestMethod]
        public async System.Threading.Tasks.Task VerifyEmailReturnsVerifyEmailWhenUserNotFound() {
            //Arrange
            _userManagerMock.Setup(x => x.FindByEmailAsync(It.IsAny<string>())).ReturnsAsync((User)null);

            var model = new VerifyEmailViewModel { Email = "missing@test.com" };
            var result = (ViewResult)await controller.VerifyEmail(model);

            //Assert
            Assert.AreEqual("VerifyEmail",result.ViewName);
        }

        #endregion

        #region ChangePassword

        [TestMethod]
        public void ChangePasswordLoadsView() {
            var result =
                (ViewResult)controller.ChangePassword("test@test.com");

            Assert.AreEqual(
                typeof(ChangePasswordViewModel),
                result.Model.GetType());
        }

        #endregion

        #region AddCoins

        [TestMethod]
        public async System.Threading.Tasks.Task AddCoinsReturnsUnauthorizedWhenUserMissing() {
            //Arrange
            _userManagerMock.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync((User)null);

            //Act
            var result = await controller.AddCoins(new AddCoinModel());

            //Assert
            Assert.IsInstanceOfType(result, typeof(UnauthorizedResult));
        }

        [TestMethod]
        public async System.Threading.Tasks.Task AddCoinsReturnsOkResult() {
            //Act
            var result = await controller.AddCoins( new AddCoinModel { Amount = 50 });

            //Assert
            Assert.IsInstanceOfType(result, typeof(OkObjectResult));
        }

        [TestMethod]
        public async System.Threading.Tasks.Task AddCoinsAddsCoinsToUser() {
            // Arrange
            var user = new User {
                Id = "1",
                CoinCount = 100
            };
            _userManagerMock.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync(user);

            // Act
            await controller.AddCoins(new AddCoinModel { Amount = 50 });

            // Assert
            Assert.AreEqual(150, user.CoinCount);
        }

        #endregion

        #region GetCoins

        [TestMethod]
        public async System.Threading.Tasks.Task GetCoinsReturnsUnauthorizedWhenUserMissing() {
            //Arrange
            _userManagerMock.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync((User)null);

            //Act
            var result = await controller.GetCoins();

            //Assert
            Assert.IsInstanceOfType(result, typeof(UnauthorizedResult));
        }

        [TestMethod]
        public async System.Threading.Tasks.Task GetCoinsReturnsJson() {
            //Act
            var result = await controller.GetCoins();

            //Assert
            Assert.IsInstanceOfType(result,typeof(JsonResult));
        }
        #endregion
    }
}
