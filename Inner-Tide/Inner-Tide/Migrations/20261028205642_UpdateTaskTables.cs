using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Inner_Tide.Migrations
{
    /// <inheritdoc />
    public partial class UpdateTaskTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Completed",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "Multiplier",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "Tasks");

            migrationBuilder.AddColumn<bool>(
                name: "Completed",
                table: "UserTasks",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "Multiplier",
                table: "UserTasks",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "Priority",
                table: "UserTasks",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Completed",
                table: "UserTasks");

            migrationBuilder.DropColumn(
                name: "Multiplier",
                table: "UserTasks");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "UserTasks");

            migrationBuilder.AddColumn<bool>(
                name: "Completed",
                table: "Tasks",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "Multiplier",
                table: "Tasks",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "Priority",
                table: "Tasks",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }
    }
}
