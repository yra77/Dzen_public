namespace Comments.Api.Infrastructure;

public sealed class LocalAttachmentStorageOptions
{
    public string RootPath { get; init; } = "uploads";
    public int MaxSizeBytes { get; init; } = 1_048_576;
    public int MaxTextSizeBytes { get; init; } = 102_400;
    public int MaxImageWidth { get; init; } = 320;
    public int MaxImageHeight { get; init; } = 240;
}
