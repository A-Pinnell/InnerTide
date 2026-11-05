using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Inner_Tide.Migrations
{
    /// <inheritdoc />
    public partial class FixNamingError : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AquariumItemGridCell_Aquariums_AquariumId",
                table: "AquariumItemGridCell");

            migrationBuilder.DropForeignKey(
                name: "FK_AquariumItemGridCell_UserItems_UserItemId",
                table: "AquariumItemGridCell");

            migrationBuilder.DropPrimaryKey(
                name: "PK_AquariumItemGridCell",
                table: "AquariumItemGridCell");

            migrationBuilder.RenameTable(
                name: "AquariumItemGridCell",
                newName: "AquariumItemGridCells");

            migrationBuilder.RenameIndex(
                name: "IX_AquariumItemGridCell_UserItemId",
                table: "AquariumItemGridCells",
                newName: "IX_AquariumItemGridCells_UserItemId");

            migrationBuilder.RenameIndex(
                name: "IX_AquariumItemGridCell_AquariumId",
                table: "AquariumItemGridCells",
                newName: "IX_AquariumItemGridCells_AquariumId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_AquariumItemGridCells",
                table: "AquariumItemGridCells",
                column: "AquariumItemGridCellId");

            migrationBuilder.AddForeignKey(
                name: "FK_AquariumItemGridCells_Aquariums_AquariumId",
                table: "AquariumItemGridCells",
                column: "AquariumId",
                principalTable: "Aquariums",
                principalColumn: "AquariumId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_AquariumItemGridCells_UserItems_UserItemId",
                table: "AquariumItemGridCells",
                column: "UserItemId",
                principalTable: "UserItems",
                principalColumn: "UserItemId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AquariumItemGridCells_Aquariums_AquariumId",
                table: "AquariumItemGridCells");

            migrationBuilder.DropForeignKey(
                name: "FK_AquariumItemGridCells_UserItems_UserItemId",
                table: "AquariumItemGridCells");

            migrationBuilder.DropPrimaryKey(
                name: "PK_AquariumItemGridCells",
                table: "AquariumItemGridCells");

            migrationBuilder.RenameTable(
                name: "AquariumItemGridCells",
                newName: "AquariumItemGridCell");

            migrationBuilder.RenameIndex(
                name: "IX_AquariumItemGridCells_UserItemId",
                table: "AquariumItemGridCell",
                newName: "IX_AquariumItemGridCell_UserItemId");

            migrationBuilder.RenameIndex(
                name: "IX_AquariumItemGridCells_AquariumId",
                table: "AquariumItemGridCell",
                newName: "IX_AquariumItemGridCell_AquariumId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_AquariumItemGridCell",
                table: "AquariumItemGridCell",
                column: "AquariumItemGridCellId");

            migrationBuilder.AddForeignKey(
                name: "FK_AquariumItemGridCell_Aquariums_AquariumId",
                table: "AquariumItemGridCell",
                column: "AquariumId",
                principalTable: "Aquariums",
                principalColumn: "AquariumId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_AquariumItemGridCell_UserItems_UserItemId",
                table: "AquariumItemGridCell",
                column: "UserItemId",
                principalTable: "UserItems",
                principalColumn: "UserItemId");
        }
    }
}
