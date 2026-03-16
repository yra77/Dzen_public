using Comments.Application.DTOs;
using Comments.Application.Services;

namespace Comments.Api.GraphQL;

public sealed class CommentMutations
{
    public Task<CommentDto> CreateComment(
        [Service] CommentService commentService,
        CreateCommentInput input,
        CancellationToken cancellationToken)
    {
        var request = new CreateCommentRequest(
            input.ParentId,
            input.UserName,
            input.Email,
            input.HomePage,
            input.Text);

        return commentService.CreateAsync(request, cancellationToken);
    }
}
