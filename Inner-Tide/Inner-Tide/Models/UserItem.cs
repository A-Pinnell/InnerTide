using System.ComponentModel.DataAnnotations;

namespace Inner_Tide.Models {
    public class UserItem {
        public int UserItemId { get; set; }

        [Required]
        public bool IsInAquarium { get; set; }

        //Foreign Key
        [Required]
        public int UserId { get; set; }
        public User? User { get; set; }

        [Required]
        public required string ItemId { get; set; }
    }
}
