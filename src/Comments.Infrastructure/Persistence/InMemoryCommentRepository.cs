

using Comments.Application.Abstractions;
using Comments.Application.DTOs;
using Comments.Domain.Entities;


namespace Comments.Infrastructure.Persistence;
/// <summary>
/// Реалізація репозиторію в пам'яті, що використовується для тестів та легких локальних сценаріїв.
/// </summary>
public sealed class InMemoryCommentRepository : ICommentRepository
{


    private readonly List<Comment> _items = new();


    /// <summary>
    /// Знаходить коментар за ідентифікатором.
    /// </summary>
    /// <param name="id">Comment identifier.</param>
    /// <param name="cancellationToken">Cancellation token (not used in in-memory implementation).</param>
    /// <returns>Matching comment instance or <c>null</c> when comment does not exist.</returns>
    public Task<Comment?> FindByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return Task.FromResult(_items.FirstOrDefault(c => c.Id == id));
    }


    /// <summary>
    /// Повертає всі коментарі, що наразі зберігаються в пам'яті.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token (not used in in-memory implementation).</param>
    /// <returns>Readonly snapshot всіх збережених коментарів.</returns>
    public Task<IReadOnlyCollection<Comment>> GetAllAsync(CancellationToken cancellationToken)
    {
        return Task.FromResult<IReadOnlyCollection<Comment>>(_items.ToArray());
    }

    /// <summary>
    /// Повертає коментарі кореневого типу з розбитими сторінками та додатковим фільтром та сортуванням.
    /// </summary>
    /// <param name="page">1-based page index.</param>
    /// <param name="pageSize">Page size.</param>
    /// <param name="sortField">Sort field.</param>
    /// <param name="sortDirection">Sort direction.</param>
    /// <param name="filter">Optional search filter by author/email/text.</param>
    /// <param name="cancellationToken">Cancellation token (not used in in-memory implementation).</param>
    /// <returns>Tuple (кортеж) з елементами сторінки та загальною кількістю кореневих коментарів для поточного фільтра.</returns>
    public Task<(IReadOnlyCollection<Comment> Items, int TotalCount)> GetRootCommentsAsync(
        int page,
        int pageSize,
        CommentSortField sortField,
        CommentSortDirection sortDirection,
        string? filter,
        CancellationToken cancellationToken)
    {
        var query = _items.Where(x => x.ParentId is null);

        if (!string.IsNullOrWhiteSpace(filter))
        {
            var normalizedFilter = filter.Trim();
            query = query.Where(x =>
                x.UserName.Contains(normalizedFilter, StringComparison.OrdinalIgnoreCase) ||
                x.Email.Contains(normalizedFilter, StringComparison.OrdinalIgnoreCase) ||
                x.Text.Contains(normalizedFilter, StringComparison.OrdinalIgnoreCase));
        }
        var totalCount = query.Count();

        var sorted = ApplySort(query, sortField, sortDirection);

        var pageItems = sorted
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToArray();

        return Task.FromResult<(IReadOnlyCollection<Comment> Items, int TotalCount)>((pageItems, totalCount));
    }

    /// <summary>
    /// Додає коментар до сховища в оперативній пам'яті.
    /// </summary>
    /// <param name="comment">Comment to store.</param>
    /// <param name="cancellationToken">Cancellation token (not used in in-memory implementation).</param>
    public Task AddAsync(Comment comment, CancellationToken cancellationToken)
    {
        _items.Add(comment);
        return Task.CompletedTask;
    }

    private static IOrderedEnumerable<Comment> ApplySort(
        IEnumerable<Comment> query,
        CommentSortField sortField,
        CommentSortDirection sortDirection)
    {
        return (sortField, sortDirection) switch
        {
            (CommentSortField.UserName, CommentSortDirection.Asc) => query.OrderBy(x => x.UserName),
            (CommentSortField.UserName, CommentSortDirection.Desc) => query.OrderByDescending(x => x.UserName),
            (CommentSortField.Email, CommentSortDirection.Asc) => query.OrderBy(x => x.Email),
            (CommentSortField.Email, CommentSortDirection.Desc) => query.OrderByDescending(x => x.Email),
            (CommentSortField.CreatedAtUtc, CommentSortDirection.Asc) => query.OrderBy(x => x.CreatedAtUtc),
            _ => query.OrderByDescending(x => x.CreatedAtUtc)
        };
    }
}