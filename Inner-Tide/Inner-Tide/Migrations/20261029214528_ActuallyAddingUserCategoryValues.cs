using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Inner_Tide.Migrations
{
    /// <inheritdoc />
    public partial class ActuallyAddingUserCategoryValues : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "userCategoryValues",
                columns: table => new
                {
                    UserCategoryValuesId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Sleep = table.Column<int>(type: "int", nullable: false),
                    Hydration = table.Column<int>(type: "int", nullable: false),
                    Fitness = table.Column<int>(type: "int", nullable: false),
                    Learning = table.Column<int>(type: "int", nullable: false),
                    Organization = table.Column<int>(type: "int", nullable: false),
                    Mood = table.Column<int>(type: "int", nullable: false),
                    Nutritiion = table.Column<int>(type: "int", nullable: false),
                    Social = table.Column<int>(type: "int", nullable: false),
                    Productivity = table.Column<int>(type: "int", nullable: false),
                    Finance = table.Column<int>(type: "int", nullable: false),
                    Exploration = table.Column<int>(type: "int", nullable: false),
                    Habit = table.Column<int>(type: "int", nullable: false),
                    Hobby = table.Column<int>(type: "int", nullable: false),
                    Wellness = table.Column<int>(type: "int", nullable: false),
                    Creativity = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_userCategoryValues", x => x.UserCategoryValuesId);
                    table.ForeignKey(
                        name: "FK_userCategoryValues_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_userCategoryValues_UserId",
                table: "userCategoryValues",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "userCategoryValues");
        }
    }
}
