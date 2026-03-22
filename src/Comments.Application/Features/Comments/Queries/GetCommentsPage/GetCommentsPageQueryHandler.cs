// File overview: MediatR handler that delegates root comment page retrieval to the domain service layer.
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

    /// <summary>
    /// Creates query handler for root comment pages.
    /// </summary>
    /// <param name="commentService">Service that encapsulates page retrieval logic.</param>
    public GetCommentsPageQueryHandler(CommentService commentService)
    {
        _commentService = commentService;
    }

    /// <summary>
    /// Handles query for root comments page with sorting and filter options.
    /// </summary>
    /// <param name="request">Query parameters from caller.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Paged comment result for requested page parameters.</returns>
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
