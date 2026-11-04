using System.ComponentModel.DataAnnotations;

namespace Inner_Tide.Models {
    public class UserItem {
        public int UserItemId { get; set; }

        [Required]
        public bool IsInAquarium { get; set; }

        //Foreign Key
        [Required]
        public string UserId { get; set; }
        public User? User { get; set; }

        [Required]
        public required string ItemId { get; set; }

        public int? AquariumId { get; set; }
        public Aquarium? Aquarium { get; set; }
        public int? SandLayer { get; set; }
        public int? GridX { get; set; }
        public int? GridY { get; set; }
    }
}
