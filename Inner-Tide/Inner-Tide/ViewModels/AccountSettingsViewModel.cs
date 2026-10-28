using System.ComponentModel.DataAnnotations;

namespace Inner_Tide.ViewModels {
    public class AccountSettingsViewModel {
        [Required(ErrorMessage = "Enter your current password to confirm account changes.")]
        [DataType(DataType.Password)]
        public string CurrentPassword { get; set; } = "";

        [StringLength(256)]
        public string? NewUserName { get; set; }

        [EmailAddress]
        public string? NewEmail { get; set; }
    }
}
