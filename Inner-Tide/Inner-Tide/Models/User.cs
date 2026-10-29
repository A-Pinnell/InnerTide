using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;

namespace Inner_Tide.Models {
    public class User : IdentityUser {
        [Range(0, 99)]
        [Required] 
        public int AccountLevel { get; set; }

        [Required]
        public int XPForNextLevel { get; set; } 

        [Range(0, 999)]
        [Required]
        public int CoinCount { get; set; }

        [Required]
        public bool FirstTimeLogin { get; set; }
    }
}
