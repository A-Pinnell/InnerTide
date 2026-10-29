using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace Inner_Tide.Models {
    public class CategoryValues {
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
        public int Nutritiion { get; set; }

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
    }
}

//Sleep,
//Hydration,
//Fitness,
//Learning,
//Organization,
//Mood,
//Nutrition,
//Social,
//Productivity,
//Finance,
//Exploration,
//Habit,
//Hobby,
//Wellness,
//Creativity

/* 
 * --- Will Most Likely be Implemented for P3 ---
 * These value will be calculated and formed when a user completes a quiz.
 * Calculated (probably) from the total values number of the quiz 5 (max) * NumOfQuestions
 * That percentage is then used to calculate the amount of one specific task type will appear when the user next generates a task list
 * Lower percentages are prioritized more as they equate to less focus in that area of the users life.
 */
