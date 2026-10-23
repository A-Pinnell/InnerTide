using System.ComponentModel.DataAnnotations;

namespace Inner_Tide.Models {
    public class UserTask {
        [Required]
        public int UserTaskId { get; set; }


        //Foreign Key
        public string UserId { get; set; }
        public User? User { get; set; }

        public int TaskId { get; set; }
        public Task? Task { get; set; }
    }
}
