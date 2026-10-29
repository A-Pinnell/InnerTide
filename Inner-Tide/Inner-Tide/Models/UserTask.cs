using System.ComponentModel.DataAnnotations;

namespace Inner_Tide.Models {
    public class UserTask {
        [Required]
        public int UserTaskId { get; set; }

        [Required]
        public bool Priority { get; set; }

        [Range(1, 2)]
        [Required]
        public int Multiplier { get; set; }

        [Required]
        public bool Completed { get; set; }

        [Required]
        public DateTime AssignedAt { get; set; }

        //Foreign Key
        public string UserId { get; set; }
        public User? User { get; set; }

        public int TaskId { get; set; }
        public Task? Task { get; set; }
    }
}
