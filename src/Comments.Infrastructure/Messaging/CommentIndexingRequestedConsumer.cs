using Comments.Application.Abstractions;

using MassTransit;

using Microsoft.Extensions.Logging;

namespace Comments.Infrastructure.Messaging;

/// <summary>
/// Consumer задачі індексації коментаря з idempotency-перевіркою.
/// </summary>
public sealed class CommentIndexingRequestedConsumer : IConsumer<CommentIndexingRequested>
{
    private readonly IProcessedMessageRepository _processedMessageRepository;
    private readonly ILogger<CommentIndexingRequestedConsumer> _logger;

    /// <summary>
    /// Ініціалізує consumer для черги індексації.
    /// </summary>
    /// <param name="processedMessageRepository">Репозиторій маркування оброблених повідомлень.</param>
    /// <param name="logger">Логер consumer-а.</param>
    public CommentIndexingRequestedConsumer(
        IProcessedMessageRepository processedMessageRepository,
        ILogger<CommentIndexingRequestedConsumer> logger)
    {
        _processedMessageRepository = processedMessageRepository;
        _logger = logger;
    }

    /// <summary>
    /// Обробляє задачу індексації і пропускає дублікати по MessageId.
    /// </summary>
    /// <param name="context">Контекст доставки повідомлення від MassTransit.</param>
    public async Task Consume(ConsumeContext<CommentIndexingRequested> context)
    {
        if (!await TryMarkProcessedAsync(context.MessageId, context.CancellationToken))
        {
            _logger.LogInformation("[indexing] duplicate message skipped: {MessageId}", context.MessageId);
            return;
        }

        _logger.LogInformation(
            "[indexing] processed comment {CommentId} for search indexing",
            context.Message.Comment.Id);
    }

    /// <summary>
    /// Повертає true, якщо повідомлення обробляється вперше.
    /// </summary>
    private Task<bool> TryMarkProcessedAsync(Guid? messageId, CancellationToken cancellationToken)
    {
        if (messageId is null)
        {
            return Task.FromResult(true);
        }

        return _processedMessageRepository.TryMarkProcessedAsync(messageId.Value.ToString("N"), cancellationToken);
    }
}
