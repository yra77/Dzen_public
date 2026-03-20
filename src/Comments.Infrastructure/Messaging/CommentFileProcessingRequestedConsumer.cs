using Comments.Application.Abstractions;

using MassTransit;

using Microsoft.Extensions.Logging;

namespace Comments.Infrastructure.Messaging;

/// <summary>
/// Consumer задачі обробки вкладень із idempotency-перевіркою.
/// </summary>
public sealed class CommentFileProcessingRequestedConsumer : IConsumer<CommentFileProcessingRequested>
{
    private readonly IProcessedMessageRepository _processedMessageRepository;
    private readonly ILogger<CommentFileProcessingRequestedConsumer> _logger;

    /// <summary>
    /// Ініціалізує consumer для черги обробки вкладень.
    /// </summary>
    /// <param name="processedMessageRepository">Репозиторій маркування оброблених повідомлень.</param>
    /// <param name="logger">Логер consumer-а.</param>
    public CommentFileProcessingRequestedConsumer(
        IProcessedMessageRepository processedMessageRepository,
        ILogger<CommentFileProcessingRequestedConsumer> logger)
    {
        _processedMessageRepository = processedMessageRepository;
        _logger = logger;
    }

    /// <summary>
    /// Обробляє задачу вкладення і пропускає дублікати по MessageId.
    /// </summary>
    /// <param name="context">Контекст доставки повідомлення від MassTransit.</param>
    public async Task Consume(ConsumeContext<CommentFileProcessingRequested> context)
    {
        if (!await TryMarkProcessedAsync(context.MessageId, context.CancellationToken))
        {
            _logger.LogInformation("[file-processing] duplicate message skipped: {MessageId}", context.MessageId);
            return;
        }

        _logger.LogInformation(
            "[file-processing] processed attachment for comment {CommentId}",
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
