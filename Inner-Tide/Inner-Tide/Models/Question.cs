using System.ComponentModel.DataAnnotations;

namespace Inner_Tide.Models {
    public class Question {
        [Required]
        public int QuestionId { get; set; }

        [Required]
        public string QuestionTitle { get; set; }   

        [Required]
        [Range(1, 5)]
        public int AnswerValue { get; set; }    

        [Required]
        public string CategoryTag { get; set; }
    }
}
