using Comments.Application.DTOs;
using MediatR;

namespace Comments.Application.Features.Comments.Queries.GetCommentsPage;

/// <summary>
/// Query contract for retrieving paged root comments with sorting and optional filter.
/// </summary>
public sealed record GetCommentsPageQuery(
    int Page = 1,
    int PageSize = 25,
    CommentSortField SortBy = CommentSortField.CreatedAtUtc,
    CommentSortDirection SortDirection = CommentSortDirection.Desc,
    string? Filter = null) : IRequest<PagedResult<CommentDto>>;
