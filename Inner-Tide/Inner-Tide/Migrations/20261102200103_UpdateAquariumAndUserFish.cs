using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Inner_Tide.Migrations
{
    /// <inheritdoc />
    public partial class UpdateAquariumAndUserFish : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "AcquiredAt",
                table: "UserFish",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "FirstPlacedUserFishId",
                table: "Aquariums",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UserFishId",
                table: "Aquariums",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Aquariums_FirstPlacedUserFishId",
                table: "Aquariums",
                column: "FirstPlacedUserFishId");

            migrationBuilder.CreateIndex(
                name: "IX_Aquariums_UserFishId",
                table: "Aquariums",
                column: "UserFishId");

            migrationBuilder.AddForeignKey(
                name: "FK_Aquariums_UserFish_FirstPlacedUserFishId",
                table: "Aquariums",
                column: "FirstPlacedUserFishId",
                principalTable: "UserFish",
                principalColumn: "UserFishId");

            migrationBuilder.AddForeignKey(
                name: "FK_Aquariums_UserFish_UserFishId",
                table: "Aquariums",
                column: "UserFishId",
                principalTable: "UserFish",
                principalColumn: "UserFishId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Aquariums_UserFish_FirstPlacedUserFishId",
                table: "Aquariums");

            migrationBuilder.DropForeignKey(
                name: "FK_Aquariums_UserFish_UserFishId",
                table: "Aquariums");

            migrationBuilder.DropIndex(
                name: "IX_Aquariums_FirstPlacedUserFishId",
                table: "Aquariums");

            migrationBuilder.DropIndex(
                name: "IX_Aquariums_UserFishId",
                table: "Aquariums");

            migrationBuilder.DropColumn(
                name: "AcquiredAt",
                table: "UserFish");

            migrationBuilder.DropColumn(
                name: "FirstPlacedUserFishId",
                table: "Aquariums");

            migrationBuilder.DropColumn(
                name: "UserFishId",
                table: "Aquariums");
        }
    }
}
