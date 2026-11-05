using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Inner_Tide.Models {
    public class AquariumItemGridCell {
        public int AquariumItemGridCellId { get; set; }

        [Required]
        public int SandLayer { get; set; }

        [Required]
        public int GridX { get; set; }

        [Required]
        public int GridY { get; set; }

        //Foreign Keys
        [Required]
        public int AquariumId { get; set; }

        public Aquarium? Aquarium { get; set; }

        [Required]
        public int UserItemId { get; set; }

        public UserItem? UserItem { get; set; }

    }
}