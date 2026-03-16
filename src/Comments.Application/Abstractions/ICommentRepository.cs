using Comments.Application.DTOs;
using Comments.Domain.Entities;

namespace Comments.Application.Abstractions;

public interface ICommentRepository
{
    Task<Comment?> FindByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<(IReadOnlyCollection<Comment> Items, int TotalCount)> GetRootCommentsAsync(
        int page,
        int pageSize,
        CommentSortField sortField,
        CommentSortDirection sortDirection,
        CancellationToken cancellationToken);
    Task AddAsync(Comment comment, CancellationToken cancellationToken);
}
