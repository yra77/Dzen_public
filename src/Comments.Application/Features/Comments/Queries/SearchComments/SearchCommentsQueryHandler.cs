using Comments.Application.DTOs;
using Comments.Application.Abstractions;
using MediatR;

namespace Comments.Application.Features.Comments.Queries.SearchComments;

/// <summary>
/// Handles full-text comment search queries via configured search provider.
/// </summary>
public sealed class SearchCommentsQueryHandler : IRequestHandler<SearchCommentsQuery, PagedResult<CommentDto>>
{
    private readonly ICommentSearchService _commentSearchService;

    /// <summary>
    /// Initializes a new instance of the <see cref="SearchCommentsQueryHandler"/> class.
    /// </summary>
    /// <param name="commentSearchService">Search abstraction used to execute text queries.</param>
    public SearchCommentsQueryHandler(ICommentSearchService commentSearchService)
    {
        _commentSearchService = commentSearchService;
    }

    /// <summary>
    /// Executes a paged search query.
    /// </summary>
    /// <param name="request">Search request payload.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Paged comments result.</returns>
    public Task<PagedResult<CommentDto>> Handle(SearchCommentsQuery request, CancellationToken cancellationToken)
    {
        return _commentSearchService.SearchAsync(request.Query, request.Page, request.PageSize, cancellationToken);
    }
}
