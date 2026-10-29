using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Inner_Tide.Migrations
{
    /// <inheritdoc />
    public partial class RemoveAssignedAtInTasksAddToUserTasks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AssignedAt",
                table: "Tasks");

            migrationBuilder.AddColumn<DateTime>(
                name: "AssignedAt",
                table: "UserTasks",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AssignedAt",
                table: "UserTasks");

            migrationBuilder.AddColumn<DateTime>(
                name: "AssignedAt",
                table: "Tasks",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));
        }
    }
}
