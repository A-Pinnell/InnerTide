using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Inner_Tide.Migrations
{
    /// <inheritdoc />
    public partial class AddHasViewedInfoToUserFish : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasViewedInfo",
                table: "UserFish",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HasViewedInfo",
                table: "UserFish");
        }
    }
}
