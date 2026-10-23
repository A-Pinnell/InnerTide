using System.ComponentModel.DataAnnotations;

namespace Inner_Tide.ViewModels {
    public class ChangePasswordViewModel {
        [Required(ErrorMessage = "Email is Required")]
        [EmailAddress]
        public string Email { get; set; }

        [Required(ErrorMessage = "Password is Required")]
        [Compare("ConfirmNewPassword", ErrorMessage = "Password Does Not Match")]
        [Display(Name = "New Password")]
        [DataType(DataType.Password)]
        public string NewPassword { get; set; }

        [Required(ErrorMessage = "New Password Confirmation is Required")]
        [Display(Name = "Confirm New Password")]
        [DataType(DataType.Password)]
        public string ConfirmNewPassword { get; set; }
    }
}
