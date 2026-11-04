using Inner_Tide.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;

namespace Inner_Tide.Data {
    public class ApplicationDbContext : IdentityDbContext<User> {
        protected override void OnModelCreating(ModelBuilder modelBuilder) {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Aquarium>()
                .HasOne(a => a.FirstPlacedUserFish)
                .WithMany(fish => fish.FirstPlacedInAquariums)
                .HasForeignKey(a => a.FirstPlacedUserFishId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<UserItem>()
                .HasOne(item => item.Aquarium)
                .WithMany()
                .HasForeignKey(item => item.AquariumId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<AquariumItemGridCell>()
                .HasIndex(cell => new { cell.AquariumId, cell.SandLayer, cell.GridX, cell.GridY })
                .IsUnique();

            modelBuilder.Entity<AquariumItemGridCell>()
                .HasOne<UserItem>()
                .WithMany()
                .HasForeignKey(cell => cell.UserItemId)
                .OnDelete(DeleteBehavior.Cascade);
        }

        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options) {
        }

        public DbSet<Inner_Tide.Models.User> UserAccounts{ get; set; } = default!;

        public DbSet<Inner_Tide.Models.Task> Tasks { get; set; } = default!;

        public DbSet<Inner_Tide.Models.Aquarium> Aquariums { get; set; } = default!;

        public DbSet<Inner_Tide.Models.Journal> Journals { get; set; } = default!;

        public DbSet<Inner_Tide.Models.UserFish> UserFish { get; set; } = default!;

        public DbSet<Inner_Tide.Models.UserItem> UserItems { get; set; } = default!;

        public DbSet<Inner_Tide.Models.AquariumItemGridCell> AquariumItemGridCells { get; set; } = default!;

        public DbSet<Inner_Tide.Models.UserTask> UserTasks { get; set; } = default!;

        public DbSet<Inner_Tide.Models.Quiz> Quizzes { get; set; } = default!;

        public DbSet<Inner_Tide.Models.Question> Questions { get; set; } = default!;

        public DbSet<Inner_Tide.Models.QuizQuestion> QuizQuestions { get; set; } = default!;

        public DbSet<Inner_Tide.Models.UserCategoryValues> UserCategoryValues { get; set; } = default!;
    }
}
