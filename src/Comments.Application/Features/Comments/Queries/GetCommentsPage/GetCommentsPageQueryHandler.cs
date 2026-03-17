using Comments.Application.DTOs;
using Comments.Application.Services;
using MediatR;

namespace Comments.Application.Features.Comments.Queries.GetCommentsPage;

/// <summary>
/// Handles paged root comment queries.
/// </summary>
public sealed class GetCommentsPageQueryHandler : IRequestHandler<GetCommentsPageQuery, PagedResult<CommentDto>>
{
    private readonly CommentService _commentService;

    public GetCommentsPageQueryHandler(CommentService commentService)
    {
        _commentService = commentService;
    }

    public Task<PagedResult<CommentDto>> Handle(GetCommentsPageQuery request, CancellationToken cancellationToken)
    {
        return _commentService.GetPageAsync(
            request.Page,
            request.PageSize,
            request.SortBy,
            request.SortDirection,
            request.Filter,
            cancellationToken);
    }
}
