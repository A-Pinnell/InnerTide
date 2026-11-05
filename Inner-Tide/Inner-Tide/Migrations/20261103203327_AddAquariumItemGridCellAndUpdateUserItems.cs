using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Inner_Tide.Migrations
{
    /// <inheritdoc />
    public partial class AddAquariumItemGridCellAndUpdateUserItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Aquariums_UserFish_UserFishId",
                table: "Aquariums");

            migrationBuilder.DropIndex(
                name: "IX_Aquariums_UserFishId",
                table: "Aquariums");

            migrationBuilder.DropColumn(
                name: "UserFishId",
                table: "Aquariums");

            migrationBuilder.AddColumn<int>(
                name: "AquariumId",
                table: "UserItems",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "GridX",
                table: "UserItems",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "GridY",
                table: "UserItems",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SandLayer",
                table: "UserItems",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AquariumItemGridCell",
                columns: table => new
                {
                    AquariumItemGridCellId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SandLayer = table.Column<int>(type: "int", nullable: false),
                    GridX = table.Column<int>(type: "int", nullable: false),
                    GridY = table.Column<int>(type: "int", nullable: false),
                    AquariumId = table.Column<int>(type: "int", nullable: false),
                    UserItemId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AquariumItemGridCell", x => x.AquariumItemGridCellId);
                    table.ForeignKey(
                        name: "FK_AquariumItemGridCell_Aquariums_AquariumId",
                        column: x => x.AquariumId,
                        principalTable: "Aquariums",
                        principalColumn: "AquariumId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AquariumItemGridCell_UserItems_UserItemId",
                        column: x => x.UserItemId,
                        principalTable: "UserItems",
                        principalColumn: "UserItemId");
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserItems_AquariumId",
                table: "UserItems",
                column: "AquariumId");

            migrationBuilder.CreateIndex(
                name: "IX_AquariumItemGridCell_AquariumId",
                table: "AquariumItemGridCell",
                column: "AquariumId");

            migrationBuilder.CreateIndex(
                name: "IX_AquariumItemGridCell_UserItemId",
                table: "AquariumItemGridCell",
                column: "UserItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_UserItems_Aquariums_AquariumId",
                table: "UserItems",
                column: "AquariumId",
                principalTable: "Aquariums",
                principalColumn: "AquariumId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserItems_Aquariums_AquariumId",
                table: "UserItems");

            migrationBuilder.DropTable(
                name: "AquariumItemGridCell");

            migrationBuilder.DropIndex(
                name: "IX_UserItems_AquariumId",
                table: "UserItems");

            migrationBuilder.DropColumn(
                name: "AquariumId",
                table: "UserItems");

            migrationBuilder.DropColumn(
                name: "GridX",
                table: "UserItems");

            migrationBuilder.DropColumn(
                name: "GridY",
                table: "UserItems");

            migrationBuilder.DropColumn(
                name: "SandLayer",
                table: "UserItems");

            migrationBuilder.AddColumn<int>(
                name: "UserFishId",
                table: "Aquariums",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Aquariums_UserFishId",
                table: "Aquariums",
                column: "UserFishId");

            migrationBuilder.AddForeignKey(
                name: "FK_Aquariums_UserFish_UserFishId",
                table: "Aquariums",
                column: "UserFishId",
                principalTable: "UserFish",
                principalColumn: "UserFishId");
        }
    }
}
