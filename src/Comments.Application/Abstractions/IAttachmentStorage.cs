using Comments.Application.DTOs;

namespace Comments.Application.Abstractions;

public interface IAttachmentStorage
{
    Task<StoredAttachment> SaveAsync(AttachmentUploadRequest attachment, CancellationToken cancellationToken);
}

public sealed record StoredAttachment(
    string FileName,
    string ContentType,
    string StoragePath,
    long SizeBytes);
