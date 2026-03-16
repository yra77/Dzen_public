using Comments.Application.DTOs;
using Comments.Application.Services;

namespace Comments.Api.GraphQL;

public sealed class CommentQueries
{
    public Task<PagedResult<CommentDto>> Comments(
        [Service] CommentService commentService,
        int page = 1,
        int pageSize = 25,
        CommentSortField sortBy = CommentSortField.CreatedAtUtc,
        CommentSortDirection sortDirection = CommentSortDirection.Desc,
        CancellationToken cancellationToken = default)
    {
        return commentService.GetPageAsync(page, pageSize, sortBy, sortDirection, cancellationToken);
    }
}
