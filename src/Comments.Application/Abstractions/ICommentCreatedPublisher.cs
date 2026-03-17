using Comments.Application.DTOs;

namespace Comments.Application.Abstractions;

/// <summary>
/// Контракт публікації події про створений коментар у зовнішні канали інтеграції.
/// </summary>
public interface ICommentCreatedPublisher
{
    /// <summary>
    /// Публікує інформацію про щойно створений коментар.
    /// </summary>
    /// <param name="comment">DTO створеного коментаря.</param>
    /// <param name="cancellationToken">Токен скасування.</param>
    Task PublishAsync(CommentDto comment, CancellationToken cancellationToken);
}
