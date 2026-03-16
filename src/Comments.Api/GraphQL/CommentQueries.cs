using Comments.Application.DTOs;
using Comments.Application.Features.Comments.Queries.GetCommentsPage;
using Comments.Application.Features.Comments.Queries.GetCommentThread;
using Comments.Application.Features.Comments.Queries.PreviewComment;
using Comments.Application.Features.Comments.Queries.SearchComments;
using MediatR;

namespace Comments.Api.GraphQL;

public sealed class CommentQueries
{
    public Task<PagedResult<CommentDto>> CommentsPage(
        [Service] IMediator mediator,
        int page = 1,
        int pageSize = 25,
        CommentSortField sortBy = CommentSortField.CreatedAtUtc,
        CommentSortDirection sortDirection = CommentSortDirection.Desc,
        CancellationToken cancellationToken = default)
    {
        return mediator.Send(new GetCommentsPageQuery(page, pageSize, sortBy, sortDirection), cancellationToken);
    }

    public Task<PagedResult<CommentDto>> Comments(
        [Service] IMediator mediator,
        int page = 1,
        int pageSize = 25,
        CommentSortField sortBy = CommentSortField.CreatedAtUtc,
        CommentSortDirection sortDirection = CommentSortDirection.Desc,
        CancellationToken cancellationToken = default)
    {
        return CommentsPage(mediator, page, pageSize, sortBy, sortDirection, cancellationToken);
    }

    public Task<CommentDto> CommentTree(
        [Service] IMediator mediator,
        Guid rootCommentId,
        CommentSortField sortBy = CommentSortField.CreatedAtUtc,
        CommentSortDirection sortDirection = CommentSortDirection.Desc,
        CancellationToken cancellationToken = default)
    {
        return mediator.Send(new GetCommentThreadQuery(rootCommentId, sortBy, sortDirection), cancellationToken);
    }

    public Task<PagedResult<CommentDto>> SearchComments(
        [Service] IMediator mediator,
        string query,
        int page = 1,
        int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        return mediator.Send(new SearchCommentsQuery(query, page, pageSize), cancellationToken);
    }

    public async Task<string> PreviewComment(
        [Service] IMediator mediator,
        string text,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new PreviewCommentQuery(text), cancellationToken);
    }
}
