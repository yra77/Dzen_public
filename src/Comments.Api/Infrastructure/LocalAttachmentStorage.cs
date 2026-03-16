using Comments.Application.Abstractions;
using Comments.Application.DTOs;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Processing;

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

        bytes = await NormalizeAttachmentAsync(attachment.ContentType, bytes, cancellationToken);

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

    private async Task<byte[]> NormalizeAttachmentAsync(string contentType, byte[] bytes, CancellationToken cancellationToken)
    {
        if (contentType.Equals("text/plain", StringComparison.OrdinalIgnoreCase))
        {
            if (bytes.Length > _options.MaxTextSizeBytes)
            {
                throw new ArgumentException($"Text attachment exceeds max size {_options.MaxTextSizeBytes} bytes.");
            }

            return bytes;
        }

        if (!contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return bytes;
        }

        using var image = await Image.LoadAsync(bytes, cancellationToken);
        if (image.Width <= _options.MaxImageWidth && image.Height <= _options.MaxImageHeight)
        {
            return bytes;
        }

        image.Mutate(x => x.Resize(new ResizeOptions
        {
            Size = new Size(_options.MaxImageWidth, _options.MaxImageHeight),
            Mode = ResizeMode.Max,
            Sampler = KnownResamplers.Lanczos3
        }));

        await using var ms = new MemoryStream();
        IImageEncoder encoder = GetEncoder(contentType);
        await image.SaveAsync(ms, encoder, cancellationToken);

        var resizedBytes = ms.ToArray();
        if (resizedBytes.Length > _options.MaxSizeBytes)
        {
            throw new ArgumentException($"Resized attachment exceeds max size {_options.MaxSizeBytes} bytes.");
        }

        return resizedBytes;
    }

    private static IImageEncoder GetEncoder(string contentType) => contentType.ToLowerInvariant() switch
    {
        "image/png" => new SixLabors.ImageSharp.Formats.Png.PngEncoder(),
        "image/gif" => new SixLabors.ImageSharp.Formats.Gif.GifEncoder(),
        _ => new SixLabors.ImageSharp.Formats.Jpeg.JpegEncoder()
    };
}
