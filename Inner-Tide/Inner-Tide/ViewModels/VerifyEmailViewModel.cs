using System.ComponentModel.DataAnnotations;

namespace Inner_Tide.ViewModels {
    public class VerifyEmailViewModel {
        [Required(ErrorMessage = "Email is Required")]
        [EmailAddress]
        public string Email { get; set; }

    }
}
