using Comments.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Comments.Api.Infrastructure;

public sealed class CommentsDbContext : DbContext
{
    public CommentsDbContext(DbContextOptions<CommentsDbContext> options) : base(options)
    {
    }

    public DbSet<Comment> Comments => Set<Comment>();

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
    }
}
