using Comments.Application.DTOs;
using MediatR;

namespace Comments.Application.Features.Comments.Queries.SearchComments;

/// <summary>
/// Query contract for full-text comment search with pagination.
/// </summary>
public sealed record SearchCommentsQuery(
    string Query,
    int Page = 1,
    int PageSize = 25) : IRequest<PagedResult<CommentDto>>;
