using Comments.Application.Services;
using MediatR;

namespace Comments.Application.Features.Comments.Queries.PreviewComment;

public sealed class PreviewCommentQueryHandler : IRequestHandler<PreviewCommentQuery, string>
{
    private readonly CommentService _commentService;

    public PreviewCommentQueryHandler(CommentService commentService)
    {
        _commentService = commentService;
    }

    public Task<string> Handle(PreviewCommentQuery request, CancellationToken cancellationToken)
    {
        return Task.FromResult(_commentService.Preview(request.Text));
    }
}
