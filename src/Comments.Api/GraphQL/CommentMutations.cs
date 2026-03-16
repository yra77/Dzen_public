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
            input.UserName,
            input.Email,
            input.HomePage,
            input.Text,
            input.ParentId,
            input.CaptchaToken,
            input.Attachment is null
                ? null
                : new AttachmentUploadRequest(
                    input.Attachment.FileName,
                    input.Attachment.ContentType,
                    input.Attachment.Base64Content));

        return commentService.CreateAsync(request, cancellationToken);
    }
}
