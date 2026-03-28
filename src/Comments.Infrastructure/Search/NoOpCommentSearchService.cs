

using Comments.Application.Abstractions;
using Comments.Application.DTOs;


namespace Comments.Infrastructure.Search;
/// <summary>
/// Порожня реалізація пошуку коментарів, що завжди повертає порожню сторінку.
/// </summary>
/// <remarks>
/// Застосовується коли Elasticsearch-пошук вимкнено або недоступний.
/// </remarks>
public sealed class NoOpCommentSearchService : ICommentSearchService
{
    /// <summary>
    /// Повертає порожній результат пошуку з переданими параметрами пагінації.
    /// </summary>
    /// <param name="query">Текст пошукового запиту.</param>
    /// <param name="page">Номер сторінки.</param>
    /// <param name="pageSize">Розмір сторінки.</param>
    /// <param name="cancellationToken">Токен скасування.</param>
    /// <returns>Порожня сторінка <see cref="CommentDto"/>.</returns>
    public Task<PagedResult<CommentDto>> SearchAsync(string query, int page, int pageSize, CancellationToken cancellationToken)
    {
        return Task.FromResult(new PagedResult<CommentDto>(page, pageSize, 0, Array.Empty<CommentDto>()));
    }
}