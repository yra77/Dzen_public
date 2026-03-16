namespace Comments.Application.DTOs;

public sealed record CreateCommentRequest(
    string UserName,
    string Email,
    string? HomePage,
    string Text,
    Guid? ParentId,
    string? CaptchaToken,
    AttachmentUploadRequest? Attachment);

public sealed record AttachmentUploadRequest(
    string FileName,
    string ContentType,
    string Base64Content);
