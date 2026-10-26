using System.ComponentModel.DataAnnotations;

namespace Inner_Tide.Models {
    public class Aquarium {
        [Required]
        public int AquariumId { get; set; }

        [Required]
        [Range(1, 20)]
        public int MaxFish { get; set; }

        [Required]
        [Range(1, 15)]
        public int MaxObjects { get; set; }

        [Required]
        [Range(0, 20)]
        public int CurrentFish { get; set; }

        [Required]
        [Range(0, 15)]
        public int CurrentObjects { get; set; }

        [Required]
        public int CompletionPercentage { get; set; }

        //Foreign Key
        [Required]
        public string UserId { get; set; }

        public User? User { get; set; }
        
    }
}
