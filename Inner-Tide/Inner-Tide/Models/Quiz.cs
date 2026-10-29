using System.ComponentModel.DataAnnotations;

namespace Inner_Tide.Models {
    public class Quiz {
        [Required]
        public int QuizId { get; set; }

        [Required]
        public string QuizTitle { get; set; }

        [Required]
        [Range(5, 50)]
        public int CoinRewards { get; set; }    
    }
}
