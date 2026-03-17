using Comments.Application.DTOs;
using Comments.Application.Features.Comments.Queries.GetCommentsPage;
using Comments.Application.Features.Comments.Queries.GetCommentThread;
using Comments.Application.Features.Comments.Queries.PreviewComment;
using Comments.Application.Features.Comments.Queries.SearchComments;
using MediatR;

namespace Comments.Api.GraphQL;

/// <summary>
/// GraphQL query resolvers for listing, threading, searching and previewing comments.
/// </summary>
public sealed class CommentQueries
{
    /// <summary>
    /// Повертає сторінку root-коментарів із сортуванням та опціональним фільтром.
    /// </summary>
    public Task<PagedResult<CommentDto>> CommentsPage(
        [Service] IMediator mediator,
        int page = 1,
        int pageSize = 25,
        CommentSortField sortBy = CommentSortField.CreatedAtUtc,
        CommentSortDirection sortDirection = CommentSortDirection.Desc,
        string? filter = null,
        CancellationToken cancellationToken = default)
    {
        return mediator.Send(new GetCommentsPageQuery(page, pageSize, sortBy, sortDirection, filter), cancellationToken);
    }

    /// <summary>
    /// Backward-compatible alias для <see cref="CommentsPage"/>.
    /// </summary>
    public Task<PagedResult<CommentDto>> Comments(
        [Service] IMediator mediator,
        int page = 1,
        int pageSize = 25,
        CommentSortField sortBy = CommentSortField.CreatedAtUtc,
        CommentSortDirection sortDirection = CommentSortDirection.Desc,
        string? filter = null,
        CancellationToken cancellationToken = default)
    {
        return CommentsPage(mediator, page, pageSize, sortBy, sortDirection, filter, cancellationToken);
    }

    /// <summary>
    /// Повертає дерево гілки коментарів для вказаного root-коментаря.
    /// </summary>
    public Task<CommentDto> CommentTree(
        [Service] IMediator mediator,
        Guid rootCommentId,
        CommentSortField sortBy = CommentSortField.CreatedAtUtc,
        CommentSortDirection sortDirection = CommentSortDirection.Desc,
        CancellationToken cancellationToken = default)
    {
        return mediator.Send(new GetCommentThreadQuery(rootCommentId, sortBy, sortDirection), cancellationToken);
    }

    /// <summary>
    /// Виконує пошук коментарів через налаштований search-сервіс.
    /// </summary>
    public Task<PagedResult<CommentDto>> SearchComments(
        [Service] IMediator mediator,
        string query,
        int page = 1,
        int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        return mediator.Send(new SearchCommentsQuery(query, page, pageSize), cancellationToken);
    }

    /// <summary>
    /// Повертає санітизований HTML preview тексту коментаря.
    /// </summary>
    public async Task<string> PreviewComment(
        [Service] IMediator mediator,
        string text,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new PreviewCommentQuery(text), cancellationToken);
    }
}
