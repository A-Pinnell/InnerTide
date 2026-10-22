using System.ComponentModel.DataAnnotations;

namespace Inner_Tide.Models {
    public class User {
        public int UserId { get; set; }

        [Required]
        public int Username { get; set; }

        [Required]
        [EmailAddress]
        public int Email { get; set; }

        [Required] 
        public required string Password { get; set; }

        [Range(0, 99)]
        [Required] 
        public int AccountLevel { get; set; }

        [Required]
        public int XPForNextLevel { get; set; } 

        [Range(0, 999)]
        [Required]
        public int CoinCount { get; set; }
    }
}
