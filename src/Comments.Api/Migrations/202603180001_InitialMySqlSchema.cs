using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Comments.Api.Migrations;

/// <summary>
/// Початкова схема MySQL для збереження коментарів і журналу ідемпотентності.
/// </summary>
public partial class InitialMySqlSchema : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AlterDatabase()
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.CreateTable(
            name: "Comments",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                ParentId = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                UserName = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                Email = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                HomePage = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                Text = table.Column<string>(type: "longtext", nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                CreatedAtUtc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                AttachmentFileName = table.Column<string>(type: "varchar(260)", maxLength: 260, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                AttachmentContentType = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                AttachmentStoragePath = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                AttachmentSizeBytes = table.Column<long>(type: "bigint", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Comments", x => x.Id);
                table.ForeignKey(
                    name: "FK_Comments_Comments_ParentId",
                    column: x => x.ParentId,
                    principalTable: "Comments",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            })
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.CreateTable(
            name: "ProcessedMessages",
            columns: table => new
            {
                Id = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                ProcessedAtUtc = table.Column<DateTime>(type: "datetime(6)", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ProcessedMessages", x => x.Id);
            })
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.CreateIndex(
            name: "IX_Comments_ParentId",
            table: "Comments",
            column: "ParentId");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "ProcessedMessages");

        migrationBuilder.DropTable(
            name: "Comments");
    }
}
