using Comments.Application.Abstractions;
using Comments.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Comments.Api.Infrastructure;

public sealed class EfProcessedMessageRepository : IProcessedMessageRepository
{
    private readonly CommentsDbContext _dbContext;

    public EfProcessedMessageRepository(CommentsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<bool> TryMarkProcessedAsync(string messageId, CancellationToken cancellationToken = default)
    {
        var normalizedId = messageId.Trim();
        if (string.IsNullOrWhiteSpace(normalizedId))
        {
            return false;
        }

        var exists = await _dbContext.ProcessedMessages.AnyAsync(x => x.Id == normalizedId, cancellationToken);
        if (exists)
        {
            return false;
        }

        _dbContext.ProcessedMessages.Add(new ProcessedMessage(normalizedId, DateTime.UtcNow));

        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (DbUpdateException)
        {
            return false;
        }
    }
}
