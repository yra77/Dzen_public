using Comments.Application.Abstractions;
using Comments.Application.DTOs;

namespace Comments.Infrastructure.Messaging;

/// <summary>
/// Порожня реалізація публікації події створення коментаря.
/// </summary>
/// <remarks>
/// Використовується для локальних або тестових сценаріїв, де інтеграційні канали вимкнено.
/// </remarks>
public sealed class NoOpCommentCreatedPublisher : ICommentCreatedPublisher
{
    /// <summary>
    /// Ігнорує подію створення коментаря без фактичної доставки.
    /// </summary>
    /// <param name="comment">DTO створеного коментаря.</param>
    /// <param name="cancellationToken">Токен скасування.</param>
    /// <returns>Завершене завдання без додаткових побічних ефектів.</returns>
    public Task PublishAsync(CommentDto comment, CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
