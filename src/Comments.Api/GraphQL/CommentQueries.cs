using Comments.Application.DTOs;
using Comments.Application.Services;
using Comments.Api.Infrastructure;

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

    public Task<PagedResult<CommentDto>> SearchComments(
        [Service] ICommentSearchService searchService,
        string query,
        int page = 1,
        int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        return searchService.SearchAsync(query, page, pageSize, cancellationToken);
    }
}
