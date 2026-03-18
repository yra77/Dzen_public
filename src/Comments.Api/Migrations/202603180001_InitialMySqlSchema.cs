using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Comments.Api.Migrations;

/// <summary>
/// Початкова схема SQLite для збереження коментарів і журналу ідемпотентності.
/// </summary>
public partial class InitialSqliteSchema : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Створює основну таблицю коментарів з self-reference для дерева відповідей.
        migrationBuilder.CreateTable(
            name: "Comments",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "TEXT", nullable: false),
                ParentId = table.Column<Guid>(type: "TEXT", nullable: true),
                UserName = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                Email = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                HomePage = table.Column<string>(type: "TEXT", maxLength: 512, nullable: true),
                Text = table.Column<string>(type: "TEXT", nullable: false),
                CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                AttachmentFileName = table.Column<string>(type: "TEXT", maxLength: 260, nullable: true),
                AttachmentContentType = table.Column<string>(type: "TEXT", maxLength: 128, nullable: true),
                AttachmentStoragePath = table.Column<string>(type: "TEXT", maxLength: 512, nullable: true),
                AttachmentSizeBytes = table.Column<long>(type: "INTEGER", nullable: true)
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
            });

        // Зберігає idempotency-маркери для RabbitMQ consumer-обробки.
        migrationBuilder.CreateTable(
            name: "ProcessedMessages",
            columns: table => new
            {
                Id = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                ProcessedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ProcessedMessages", x => x.Id);
            });

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
