using System.ComponentModel.DataAnnotations;

namespace Inner_Tide.Models {
    public class AquariumItemGridCell {
        public int AquariumItemGridCellId { get; set; }
        public int SandLayer { get; set; }
        public int GridX { get; set; }
        public int GridY { get; set; }

        [Required]
        public int AquariumId { get; set; }

        [Required]
        public int UserItemId { get; set; }

        public Aquarium? Aquarium { get; set; }

        public UserItem? UserItem { get; set; }
    }
}
