using Comments.Application.DTOs;
using Comments.Application.Services;
using MediatR;

namespace Comments.Application.Features.Comments.Queries.GetCommentThread;

public sealed class GetCommentThreadQueryHandler : IRequestHandler<GetCommentThreadQuery, CommentDto>
{
    private readonly CommentService _commentService;

    public GetCommentThreadQueryHandler(CommentService commentService)
    {
        _commentService = commentService;
    }

    public Task<CommentDto> Handle(GetCommentThreadQuery request, CancellationToken cancellationToken)
    {
        return _commentService.GetThreadAsync(
            request.RootCommentId,
            request.SortBy,
            request.SortDirection,
            cancellationToken);
    }
}
