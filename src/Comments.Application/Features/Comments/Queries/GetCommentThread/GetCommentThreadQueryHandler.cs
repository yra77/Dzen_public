using Comments.Application.DTOs;
using Comments.Application.Services;
using MediatR;

namespace Comments.Application.Features.Comments.Queries.GetCommentThread;

/// <summary>
/// Handles requests for loading a threaded comment tree by root identifier.
/// </summary>
public sealed class GetCommentThreadQueryHandler : IRequestHandler<GetCommentThreadQuery, CommentDto>
{
    private readonly CommentService _commentService;

    /// <summary>
    /// Initializes a new instance of the <see cref="GetCommentThreadQueryHandler"/> class.
    /// </summary>
    /// <param name="commentService">Application service that composes comment-thread data.</param>
    public GetCommentThreadQueryHandler(CommentService commentService)
    {
        _commentService = commentService;
    }

    /// <summary>
    /// Handles the thread query and returns a root comment with nested replies.
    /// </summary>
    /// <param name="request">Thread query parameters.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Root comment DTO with recursively filled replies.</returns>
    public Task<CommentDto> Handle(GetCommentThreadQuery request, CancellationToken cancellationToken)
    {
        return _commentService.GetThreadAsync(
            request.RootCommentId,
            request.SortBy,
            request.SortDirection,
            cancellationToken);
    }
}
