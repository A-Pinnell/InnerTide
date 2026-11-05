using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;

namespace Inner_Tide.Models {
    public class User : IdentityUser {
        [Range(0, 99)]
        [Required]
        public int AccountLevel { get; set; }

        [Required]
        public int XPForNextLevel { get; set; }

        [Range(0, 999)]
        [Required]
        public int CoinCount { get; set; }

        [Range(0, int.MaxValue)]
        [Required]
        public int DailyTaskRegenerationCount { get; set; }

        [Range(0, int.MaxValue)]
        [Required]
        public int WeeklyTaskRegenerationCount { get; set; }

        [Range(0, int.MaxValue)]
        [Required]
        public int MonthlyTaskRegenerationCount { get; set; }

        public DateTime? DailyLastFreeTaskRefreshAt { get; set; }

        public DateTime? WeeklyLastFreeTaskRefreshAt { get; set; }

        public DateTime? MonthlyLastFreeTaskRefreshAt { get; set; }

        [Required]
        public int SmallPelletCount { get; set; }

        [Required]
        public int LargePelletCount { get; set; }

        [Required]
        public bool FirstTimeLogin { get; set; }
    }
}