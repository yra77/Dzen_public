

using Comments.Application.Abstractions;
using Comments.Domain.Entities;

using Microsoft.EntityFrameworkCore;


namespace Comments.Infrastructure.Persistence;
/// <summary>
/// EF Core-реалізація сховища ідемпотентності оброблених повідомлень.
/// </summary>
public sealed class EfProcessedMessageRepository : IProcessedMessageRepository
{


    private readonly CommentsDbContext _dbContext;


    /// <summary>
    /// Створює репозиторій на базі <see cref="CommentsDbContext"/>.
    /// </summary>
    public EfProcessedMessageRepository(CommentsDbContext dbContext)
    {
        _dbContext = dbContext;
    }


    /// <summary>
    /// Позначає message id як оброблений, якщо він зустрівся вперше.
    /// </summary>
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

    /// <summary>
    /// Видаляє застарілі записи ідемпотентності.
    /// </summary>
    public async Task<int> CleanupOlderThanAsync(DateTime olderThanUtc, CancellationToken cancellationToken = default)
    {
        var deleted = await _dbContext.ProcessedMessages
            .Where(x => x.ProcessedAtUtc < olderThanUtc)
            .ExecuteDeleteAsync(cancellationToken);

        return deleted;
    }
}
