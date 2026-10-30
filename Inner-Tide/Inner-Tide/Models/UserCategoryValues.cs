using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace Inner_Tide.Models {
    [Index(nameof(UserId), IsUnique = true)]
    public class UserCategoryValues {
        [Required]
        public int UserCategoryValuesId { get; set; }

        [Required]
        [Range(0, 100)]
        public int Sleep { get; set; }

        [Required]
        [Range(0, 100)]
        public int Hydration { get; set; }

        [Required]
        [Range(0, 100)]
        public int Fitness { get; set; }

        [Required]
        [Range(0, 100)]
        public int Learning { get; set; }

        [Required]
        [Range(0, 100)]
        public int Organization { get; set; }

        [Required]
        [Range(0, 100)]
        public int Mood { get; set; }

        [Required]
        [Range(0, 100)]
        public int Nutrition { get; set; }

        [Required]
        [Range(0, 100)]
        public int Social { get; set; }

        [Required]
        [Range(0, 100)]
        public int Productivity { get; set; }

        [Required]
        [Range(0, 100)]
        public int Finance { get; set; }

        [Required]
        [Range(0, 100)]
        public int Exploration { get; set; }

        [Required]
        [Range(0, 100)]
        public int Habit { get; set; }

        [Required]
        [Range(0, 100)]
        public int Hobby { get; set; }

        [Required]
        [Range(0, 100)]
        public int Wellness { get; set; }

        [Required]
        [Range(0, 100)]
        public int Creativity { get; set; }

        // Foreign Keys
        [Required]
        public string UserId { get; set; }

        public User? User { get; set; } 
    }
}
