using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Inner_Tide.Migrations
{
    /// <inheritdoc />
    public partial class AddAquariumCountToUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AquariumCount",
                table: "AspNetUsers",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AquariumCount",
                table: "AspNetUsers");
        }
    }
}
