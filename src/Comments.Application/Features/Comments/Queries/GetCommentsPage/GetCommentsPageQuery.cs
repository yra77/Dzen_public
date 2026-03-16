using Comments.Application.DTOs;
using MediatR;

namespace Comments.Application.Features.Comments.Queries.GetCommentsPage;

public sealed record GetCommentsPageQuery(
    int Page = 1,
    int PageSize = 25,
    CommentSortField SortBy = CommentSortField.CreatedAtUtc,
    CommentSortDirection SortDirection = CommentSortDirection.Desc) : IRequest<PagedResult<CommentDto>>;
