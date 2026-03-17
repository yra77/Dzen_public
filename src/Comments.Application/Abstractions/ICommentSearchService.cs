using Comments.Application.DTOs;

namespace Comments.Application.Abstractions;

/// <summary>
/// Контракт повнотекстового пошуку коментарів.
/// </summary>
public interface ICommentSearchService
{
    /// <summary>
    /// Виконує пошук коментарів за запитом з пагінацією.
    /// </summary>
    /// <param name="query">Пошуковий рядок.</param>
    /// <param name="page">Номер сторінки (від 1).</param>
    /// <param name="pageSize">Розмір сторінки.</param>
    /// <param name="cancellationToken">Токен скасування.</param>
    /// <returns>Сторінка результатів пошуку.</returns>
    Task<PagedResult<CommentDto>> SearchAsync(string query, int page, int pageSize, CancellationToken cancellationToken);
}
