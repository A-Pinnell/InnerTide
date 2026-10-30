using System.ComponentModel.DataAnnotations;

namespace Inner_Tide.Models {
    public class Question {
        [Required]
        public int QuestionId { get; set; }

        [Required]
        public string QuestionTitle { get; set; }      

        [Required]
        public string CategoryTag { get; set; }

        public int DisplayOrder { get; set; }
    }
}
