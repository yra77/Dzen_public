namespace Comments.Application.Abstractions;

public interface IProcessedMessageRepository
{
    Task<bool> TryMarkProcessedAsync(string messageId, CancellationToken cancellationToken = default);
}
