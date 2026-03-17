using Comments.Application.DTOs;
using Comments.Application.Features.Comments.Commands.CreateComment;
using MediatR;

namespace Comments.Api.GraphQL;

/// <summary>
/// GraphQL mutation resolvers для створення коментарів і відповідей.
/// </summary>
public sealed class CommentMutations
{
    /// <summary>
    /// Створює новий коментар (root або reply залежно від ParentId).
    /// </summary>
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

    /// <summary>
    /// Створює відповідь на існуючий коментар.
    /// </summary>
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

    /// <summary>
    /// Alias для <see cref="AddComment"/> з більш загальною назвою mutation.
    /// </summary>
    public Task<CommentDto> CreateComment(
        [Service] IMediator mediator,
        CreateCommentInput input,
        CancellationToken cancellationToken)
    {
        return AddComment(mediator, input, cancellationToken);
    }
}
