using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Inner_Tide.Migrations
{
    /// <inheritdoc />
    public partial class FixSpellingMistake : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_userCategoryValues_AspNetUsers_UserId",
                table: "userCategoryValues");

            migrationBuilder.DropPrimaryKey(
                name: "PK_userCategoryValues",
                table: "userCategoryValues");

            migrationBuilder.RenameTable(
                name: "userCategoryValues",
                newName: "UserCategoryValues");

            migrationBuilder.RenameIndex(
                name: "IX_userCategoryValues_UserId",
                table: "UserCategoryValues",
                newName: "IX_UserCategoryValues_UserId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserCategoryValues",
                table: "UserCategoryValues",
                column: "UserCategoryValuesId");

            migrationBuilder.AddForeignKey(
                name: "FK_UserCategoryValues_AspNetUsers_UserId",
                table: "UserCategoryValues",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserCategoryValues_AspNetUsers_UserId",
                table: "UserCategoryValues");

            migrationBuilder.DropPrimaryKey(
                name: "PK_UserCategoryValues",
                table: "UserCategoryValues");

            migrationBuilder.RenameTable(
                name: "UserCategoryValues",
                newName: "userCategoryValues");

            migrationBuilder.RenameIndex(
                name: "IX_UserCategoryValues_UserId",
                table: "userCategoryValues",
                newName: "IX_userCategoryValues_UserId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_userCategoryValues",
                table: "userCategoryValues",
                column: "UserCategoryValuesId");

            migrationBuilder.AddForeignKey(
                name: "FK_userCategoryValues_AspNetUsers_UserId",
                table: "userCategoryValues",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
