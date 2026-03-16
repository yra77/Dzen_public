using Comments.Application.DTOs;
using MediatR;

namespace Comments.Application.Features.Comments.Queries.SearchComments;

public sealed record SearchCommentsQuery(
    string Query,
    int Page = 1,
    int PageSize = 25) : IRequest<PagedResult<CommentDto>>;
