using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace Inner_Tide.ViewModels {
    public class LoginViewModel {
        [Required(ErrorMessage = "Email or UserName is Required")]
        public string EmailOrUserName { get; set; }   

        [Required(ErrorMessage = "Password is Required")]
        [DataType(DataType.Password)]
        public string Password { get; set; }

        [Display(Name = "Remember Me?")]
        public bool RememberMe { get; set; }
    }
}
