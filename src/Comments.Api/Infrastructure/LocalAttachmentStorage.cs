using Comments.Application.Abstractions;
using Comments.Application.DTOs;

namespace Comments.Api.Infrastructure;

public sealed class LocalAttachmentStorage : IAttachmentStorage
{
    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "text/plain",
        "image/png",
        "image/jpeg",
        "image/gif"
    };

    private readonly LocalAttachmentStorageOptions _options;

    public LocalAttachmentStorage(LocalAttachmentStorageOptions options)
    {
        _options = options;
    }

    public async Task<StoredAttachment> SaveAsync(AttachmentUploadRequest attachment, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(attachment.FileName))
        {
            throw new ArgumentException("Attachment file name is required.");
        }

        if (!AllowedContentTypes.Contains(attachment.ContentType))
        {
            throw new ArgumentException("Unsupported attachment content type.");
        }

        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(attachment.Base64Content);
        }
        catch (FormatException)
        {
            throw new ArgumentException("Attachment content must be valid base64.");
        }

        if (bytes.Length == 0)
        {
            throw new ArgumentException("Attachment content is empty.");
        }

        if (bytes.Length > _options.MaxSizeBytes)
        {
            throw new ArgumentException($"Attachment exceeds max size {_options.MaxSizeBytes} bytes.");
        }

        var originalName = Path.GetFileName(attachment.FileName.Trim());
        var extension = Path.GetExtension(originalName);
        var storedFileName = $"{Guid.NewGuid():N}{extension}";
        var root = Path.GetFullPath(_options.RootPath);
        Directory.CreateDirectory(root);

        var fullPath = Path.Combine(root, storedFileName);
        await File.WriteAllBytesAsync(fullPath, bytes, cancellationToken);

        var relativeRoot = _options.RootPath.TrimEnd('/', '\\');
        return new StoredAttachment(
            originalName,
            attachment.ContentType,
            $"{relativeRoot}/{storedFileName}",
            bytes.Length);
    }
}
