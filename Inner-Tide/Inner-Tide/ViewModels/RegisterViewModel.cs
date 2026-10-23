using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

namespace Inner_Tide.ViewModels {
    public class RegisterViewModel {
        [Required(ErrorMessage = "UserName is Required")]
        public string UserName { get; set; }

        [Required(ErrorMessage = "Email is Required")]
        [EmailAddress]
        public string Email { get; set; }

        [Required(ErrorMessage = "Password is Required")]
        [Compare("ConfirmPassword", ErrorMessage = "Password Does Not Match")]
        [DataType(DataType.Password)]
        public string Password { get; set; }

        [Required(ErrorMessage = "Password Confirmation is Required")]
        [Display(Name = "Confirm Password")]
        [Compare("Password", ErrorMessage = "Passwords do not match")]
        [DataType(DataType.Password)]
        public string ConfirmPassword { get; set; } 
    }
}
