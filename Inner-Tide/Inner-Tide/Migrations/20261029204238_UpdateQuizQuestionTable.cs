using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Inner_Tide.Migrations
{
    /// <inheritdoc />
    public partial class UpdateQuizQuestionTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "UserId",
                table: "QuizQuestions",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_QuizQuestions_UserId",
                table: "QuizQuestions",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_QuizQuestions_AspNetUsers_UserId",
                table: "QuizQuestions",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_QuizQuestions_AspNetUsers_UserId",
                table: "QuizQuestions");

            migrationBuilder.DropIndex(
                name: "IX_QuizQuestions_UserId",
                table: "QuizQuestions");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "QuizQuestions");
        }
    }
}
