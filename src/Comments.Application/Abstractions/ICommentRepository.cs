using Comments.Application.DTOs;
using Comments.Domain.Entities;

namespace Comments.Application.Abstractions;

/// <summary>
/// Contract for working with comment persistence and tree-oriented retrieval operations.
/// </summary>
public interface ICommentRepository
{
    /// <summary>
    /// Finds a comment by identifier.
    /// </summary>
    Task<Comment?> FindByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>
    /// Returns all comments from the storage.
    /// </summary>
    Task<IReadOnlyCollection<Comment>> GetAllAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Returns paged root comments with sorting and optional filter by user name/email/text.
    /// </summary>
    Task<(IReadOnlyCollection<Comment> Items, int TotalCount)> GetRootCommentsAsync(
        int page,
        int pageSize,
        CommentSortField sortField,
        CommentSortDirection sortDirection,
        string? filter,
        CancellationToken cancellationToken);

    /// <summary>
    /// Adds a new comment entity to storage.
    /// </summary>
    Task AddAsync(Comment comment, CancellationToken cancellationToken);
}
