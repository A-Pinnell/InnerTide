using System.ComponentModel.DataAnnotations;

namespace Inner_Tide.Models {
    public class Journal {
        [Required]
        public int JournalId { get; set; }

        [Required]
        public string JournalTitle { get; set; }

        [Required]
        public string JournalContent { get; set; }

        [Required]
        public DateTime JournalCreation { get; set; }

        //Foreign Key
        [Required]
        public int UserId { get; set; }

        public User? User { get; set; }

    }
}
