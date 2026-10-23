using System.ComponentModel.DataAnnotations;

namespace Inner_Tide.Models {
    public class UserFish {
        public int UserFishId { get; set; }

        [Required]
        public bool IsInAquarium { get; set; }

        //Foreign Key
        [Required]
        public string UserId { get; set; }
        public User? User { get; set; }

        [Required]
        public required string FishId { get; set; }

        public int? AquariumId { get; set; }
        public Aquarium? Aquarium { get; set; }
    }
}
