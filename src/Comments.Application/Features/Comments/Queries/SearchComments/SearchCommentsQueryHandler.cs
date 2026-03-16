using Comments.Application.DTOs;
using Comments.Application.Abstractions;
using MediatR;

namespace Comments.Application.Features.Comments.Queries.SearchComments;

public sealed class SearchCommentsQueryHandler : IRequestHandler<SearchCommentsQuery, PagedResult<CommentDto>>
{
    private readonly ICommentSearchService _commentSearchService;

    public SearchCommentsQueryHandler(ICommentSearchService commentSearchService)
    {
        _commentSearchService = commentSearchService;
    }

    public Task<PagedResult<CommentDto>> Handle(SearchCommentsQuery request, CancellationToken cancellationToken)
    {
        return _commentSearchService.SearchAsync(request.Query, request.Page, request.PageSize, cancellationToken);
    }
}
