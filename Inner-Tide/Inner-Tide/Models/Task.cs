using System.ComponentModel.DataAnnotations;

namespace Inner_Tide.Models {
    public class Task {
        [Required]
        public int TaskId { get; set; }

        [Required]
        public string Title { get; set; }

        [Required]
        public string TimeFrame { get; set; }

        [Required]
        public int CoinReward { get; set; }

        [Range(1, 2)]
        [Required] 
        public int Multiplier { get; set; }

        [Required]
        public bool Priority { get; set; }

        [Required]
        public bool Completed { get; set; }
    }
}
