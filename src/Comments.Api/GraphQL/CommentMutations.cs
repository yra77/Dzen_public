using Comments.Application.DTOs;
using Comments.Application.Features.Comments.Commands.CreateComment;
using MediatR;

namespace Comments.Api.GraphQL;

public sealed class CommentMutations
{
    public Task<CommentDto> AddComment(
        [Service] IMediator mediator,
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

        return mediator.Send(new CreateCommentCommand(request), cancellationToken);
    }

    public Task<CommentDto> AddReply(
        [Service] IMediator mediator,
        AddReplyInput input,
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

        return mediator.Send(new CreateCommentCommand(request), cancellationToken);
    }

    public Task<CommentDto> CreateComment(
        [Service] IMediator mediator,
        CreateCommentInput input,
        CancellationToken cancellationToken)
    {
        return AddComment(mediator, input, cancellationToken);
    }
}
