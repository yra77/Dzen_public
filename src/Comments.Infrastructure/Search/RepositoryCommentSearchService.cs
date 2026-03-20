using Comments.Application.Abstractions;
using Comments.Application.DTOs;
using Comments.Domain.Entities;

namespace Comments.Infrastructure.Search;

/// <summary>
/// Фолбек-реалізація пошуку коментарів через репозиторій, коли Elasticsearch вимкнено.
/// </summary>
/// <remarks>
/// Сервіс дає працездатний search UX для локального/базового середовища без зовнішнього search-кластера.
/// </remarks>
public sealed class RepositoryCommentSearchService : ICommentSearchService
{
    private readonly ICommentRepository _commentRepository;

    /// <summary>
    /// Ініціалізує сервіс пошуку на базі репозиторію коментарів.
    /// </summary>
    /// <param name="commentRepository">Репозиторій для читання коментарів із persistence-рівня.</param>
    public RepositoryCommentSearchService(ICommentRepository commentRepository)
    {
        _commentRepository = commentRepository;
    }

    /// <summary>
    /// Виконує case-insensitive пошук по userName/email/text і повертає пагінований результат.
    /// </summary>
    /// <param name="query">Пошуковий запит.</param>
    /// <param name="page">Номер сторінки (1-based).</param>
    /// <param name="pageSize">Розмір сторінки.</param>
    /// <param name="cancellationToken">Токен скасування операції.</param>
    /// <returns>Пагінований список знайдених коментарів.</returns>
    public async Task<PagedResult<CommentDto>> SearchAsync(string query, int page, int pageSize, CancellationToken cancellationToken)
    {
        var normalizedQuery = query.Trim();
        if (string.IsNullOrWhiteSpace(normalizedQuery))
        {
            return new PagedResult<CommentDto>(page, pageSize, 0, Array.Empty<CommentDto>());
        }

        var allComments = await _commentRepository.GetAllAsync(cancellationToken);
        var matchedComments = allComments
            .Where(comment => MatchesQuery(comment, normalizedQuery))
            .OrderByDescending(comment => comment.CreatedAtUtc)
            .ToArray();

        var pagedItems = matchedComments
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(MapToDto)
            .ToArray();

        return new PagedResult<CommentDto>(page, pageSize, matchedComments.Length, pagedItems);
    }

    /// <summary>
    /// Перевіряє, чи збігається запит із текстовими полями коментаря.
    /// </summary>
    private static bool MatchesQuery(Comment comment, string normalizedQuery)
    {
        return ContainsIgnoreCase(comment.UserName, normalizedQuery)
            || ContainsIgnoreCase(comment.Email, normalizedQuery)
            || ContainsIgnoreCase(comment.Text, normalizedQuery);
    }

    /// <summary>
    /// Виконує безпечне порівняння підрядка без залежності від регістру.
    /// </summary>
    private static bool ContainsIgnoreCase(string source, string value)
    {
        return source.Contains(value, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Мапить доменну сутність у DTO для відповіді search API.
    /// </summary>
    private static CommentDto MapToDto(Comment comment)
    {
        AttachmentDto? attachment = null;
        if (comment.Attachment is not null)
        {
            attachment = new AttachmentDto(
                comment.Attachment.FileName,
                comment.Attachment.ContentType,
                comment.Attachment.StoragePath,
                comment.Attachment.SizeBytes);
        }

        return new CommentDto(
            comment.Id,
            comment.ParentId,
            comment.UserName,
            comment.Email,
            comment.HomePage,
            comment.Text,
            comment.CreatedAtUtc,
            attachment,
            Array.Empty<CommentDto>());
    }
}
