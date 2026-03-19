using Comments.Application.DTOs;

namespace Comments.Application.Abstractions;

/// <summary>
/// Контракт каналу доставки події створення коментаря в зовнішні підсистеми.
/// </summary>
public interface ICommentCreatedChannel
{
    /// <summary>
    /// Публікує DTO створеного коментаря у конкретний канал (SignalR, RabbitMQ, Elasticsearch тощо).
    /// </summary>
    /// <param name="comment">DTO щойно створеного коментаря.</param>
    /// <param name="cancellationToken">Токен скасування операції.</param>
    Task PublishAsync(CommentDto comment, CancellationToken cancellationToken);
}
