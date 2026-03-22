// File overview: in-memory repository implementation used for tests and lightweight local scenarios.
using Comments.Application.Abstractions;
using Comments.Application.DTOs;
using Comments.Domain.Entities;

namespace Comments.Infrastructure.Persistence;

/// <summary>
/// In-memory repository implementation used by tests/local runs.
/// </summary>
public sealed class InMemoryCommentRepository : ICommentRepository
{
    private readonly List<Comment> _items = new();

    /// <summary>
    /// Finds a comment by identifier.
    /// </summary>
    /// <param name="id">Comment identifier.</param>
    /// <param name="cancellationToken">Cancellation token (not used in in-memory implementation).</param>
    /// <returns>Matching comment instance or <c>null</c> when comment does not exist.</returns>
    public Task<Comment?> FindByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return Task.FromResult(_items.FirstOrDefault(c => c.Id == id));
    }

    /// <summary>
    /// Returns all comments currently stored in memory.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token (not used in in-memory implementation).</param>
    /// <returns>Readonly snapshot of all stored comments.</returns>
    public Task<IReadOnlyCollection<Comment>> GetAllAsync(CancellationToken cancellationToken)
    {
        return Task.FromResult<IReadOnlyCollection<Comment>>(_items.ToArray());
    }

    /// <summary>
    /// Returns paged root comments with optional filter and sorting.
    /// </summary>
    /// <param name="page">1-based page index.</param>
    /// <param name="pageSize">Page size.</param>
    /// <param name="sortField">Sort field.</param>
    /// <param name="sortDirection">Sort direction.</param>
    /// <param name="filter">Optional search filter by author/email/text.</param>
    /// <param name="cancellationToken">Cancellation token (not used in in-memory implementation).</param>
    /// <returns>Tuple with page items and total root comments count for the current filter.</returns>
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
    /// Adds a comment to in-memory storage.
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
