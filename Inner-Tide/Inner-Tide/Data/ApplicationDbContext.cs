using Inner_Tide.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;

namespace Inner_Tide.Data {
    public class ApplicationDbContext : IdentityDbContext<User> {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options) {
        }

        public DbSet<Inner_Tide.Models.User> UserAccounts{ get; set; } = default!;

        public DbSet<Inner_Tide.Models.Task> Tasks { get; set; } = default!;

        public DbSet<Inner_Tide.Models.Aquarium> Aquariums { get; set; } = default!;

        public DbSet<Inner_Tide.Models.Journal> Journals { get; set; } = default!;

        public DbSet<Inner_Tide.Models.UserFish> UserFish { get; set; } = default!;

        public DbSet<Inner_Tide.Models.UserItem> UserItems { get; set; } = default!;

        public DbSet<Inner_Tide.Models.UserTask> UserTasks { get; set; } = default!;


    }
}
