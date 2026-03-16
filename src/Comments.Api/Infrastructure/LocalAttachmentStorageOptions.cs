namespace Comments.Api.Infrastructure;

public sealed class LocalAttachmentStorageOptions
{
    public string RootPath { get; init; } = "uploads";
    public int MaxSizeBytes { get; init; } = 1_048_576;
}
