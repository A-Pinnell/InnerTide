using System.ComponentModel.DataAnnotations;

namespace Inner_Tide.Models {
    public class QuizQuestion {
        [Required]
        public int QuizQuestionId { get; set; }

        [Required]
        [Range(1, 5)]
        public int AnswerValue { get; set; }

        //Foreign Key
        public int QuizId { get; set; }

        public Quiz? Quiz { get; set; }

        public int QuestionId { get; set; }

        public Question? Question { get; set; }
    }
}
