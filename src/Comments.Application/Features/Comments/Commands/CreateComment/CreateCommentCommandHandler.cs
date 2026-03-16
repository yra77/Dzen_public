using Comments.Application.DTOs;
using Comments.Application.Services;
using MediatR;

namespace Comments.Application.Features.Comments.Commands.CreateComment;

public sealed class CreateCommentCommandHandler : IRequestHandler<CreateCommentCommand, CommentDto>
{
    private readonly CommentService _commentService;

    public CreateCommentCommandHandler(CommentService commentService)
    {
        _commentService = commentService;
    }

    public Task<CommentDto> Handle(CreateCommentCommand request, CancellationToken cancellationToken)
    {
        return _commentService.CreateAsync(request.Request, cancellationToken);
    }
}
