namespace Comments.Application.DTOs;

public sealed record CommentDto(
    Guid Id,
    Guid? ParentId,
    string UserName,
    string Email,
    string? HomePage,
    string Text,
    DateTime CreatedAtUtc,
    AttachmentDto? Attachment,
    IReadOnlyCollection<CommentDto> Replies);

public sealed record AttachmentDto(
    string FileName,
    string ContentType,
    string StoragePath,
    long SizeBytes);
