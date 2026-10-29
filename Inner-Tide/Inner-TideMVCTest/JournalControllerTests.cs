using Inner_Tide.Controllers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace Inner_TideMVCTest {
    [TestClass]
    public class JournalControllerTests {
        private JournalController controller;

        [TestInitialize]
        public void TestInitialize() {
            controller = new JournalController();

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
        public void JournalLoadsIndexView() {
            // Act
            var result = (ViewResult)controller.Index();

            // Assert
            Assert.AreEqual("Index", result.ViewName);
        }
        #endregion
    }


}
