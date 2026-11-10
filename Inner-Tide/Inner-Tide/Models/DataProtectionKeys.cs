namespace Inner_Tide.Models {
    using System.ComponentModel.DataAnnotations;

    namespace YourNamespace.Models {
        public class DataProtectionKey {
            public int DataProtectionKeyId { get; set; }

            public string? FriendlyName { get; set; }

            public string? Xml { get; set; }
        }
    }
}
