

using Comments.Domain.Entities;
using Microsoft.EntityFrameworkCore;


namespace Comments.Infrastructure.Persistence;
/// <summary>
/// EF Core DbContext for comments data and processed message idempotency records.
/// </summary>
public sealed class CommentsDbContext : DbContext
{


    /// <summary>
    /// Initializes DbContext with configured EF options.
    /// </summary>
    /// <param name="options">Database provider and behavior options.</param>
    public CommentsDbContext(DbContextOptions<CommentsDbContext> options) : base(options)
    {
    }


    /// <summary>
    /// Comment entities table set.
    /// </summary>
    public DbSet<Comment> Comments => Set<Comment>();

    /// <summary>
    /// Processed message entities table set for consumer idempotency.
    /// </summary>
    public DbSet<ProcessedMessage> ProcessedMessages => Set<ProcessedMessage>();

    /// <summary>
    /// Configures EF mapping for comment tree and processed message entities.
    /// </summary>
    /// <param name="modelBuilder">Model builder used to configure entity metadata.</param>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var comment = modelBuilder.Entity<Comment>();

        comment.ToTable("Comments");
        comment.HasKey(x => x.Id);

        comment.Property(x => x.UserName).HasMaxLength(128).IsRequired();
        comment.Property(x => x.Email).HasMaxLength(256).IsRequired();
        comment.Property(x => x.HomePage).HasMaxLength(512);
        comment.Property(x => x.Text).IsRequired();
        comment.Property(x => x.CreatedAtUtc).IsRequired();
        comment.Property(x => x.AttachmentFileName).HasMaxLength(260);
        comment.Property(x => x.AttachmentContentType).HasMaxLength(128);
        comment.Property(x => x.AttachmentStoragePath).HasMaxLength(512);
        comment.Property(x => x.AttachmentSizeBytes);

        comment
            .HasMany(x => x.Replies)
            .WithOne(x => x.Parent)
            .HasForeignKey(x => x.ParentId)
            .OnDelete(DeleteBehavior.Restrict);

        var processedMessage = modelBuilder.Entity<ProcessedMessage>();
        processedMessage.ToTable("ProcessedMessages");
        processedMessage.HasKey(x => x.Id);
        processedMessage.Property(x => x.Id).HasMaxLength(128).IsRequired();
        processedMessage.Property(x => x.ProcessedAtUtc).IsRequired();
    }
}
