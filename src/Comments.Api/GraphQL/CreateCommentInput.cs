namespace Comments.Api.GraphQL;

public sealed record CreateCommentInput(
    Guid? ParentId,
    string UserName,
    string Email,
    string? HomePage,
    string Text,
    string? CaptchaToken,
    AttachmentInput? Attachment);

public sealed record AttachmentInput(
    string FileName,
    string ContentType,
    string Base64Content);
