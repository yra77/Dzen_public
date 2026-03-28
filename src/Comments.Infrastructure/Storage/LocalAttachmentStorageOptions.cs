

namespace Comments.Infrastructure.Storage;
/// <summary>
/// Налаштування локального файлового сховища вкладень коментарів.
/// </summary>
public sealed class LocalAttachmentStorageOptions
{
    /// <summary>
    /// Коренева директорія для збереження завантажених файлів.
    /// </summary>
    public string RootPath { get; init; } = "uploads";

    /// <summary>
    /// Максимально допустимий розмір будь-якого вкладення в байтах.
    /// </summary>
    public int MaxSizeBytes { get; init; } = 1_048_576;

    /// <summary>
    /// Максимальний розмір txt-файлу для inline-preview.
    /// </summary>
    public int MaxTextSizeBytes { get; init; } = 102_400;

    /// <summary>
    /// Гранична ширина зображення у пікселях.
    /// </summary>
    public int MaxImageWidth { get; init; } = 320;

    /// <summary>
    /// Гранична висота зображення у пікселях.
    /// </summary>
    public int MaxImageHeight { get; init; } = 240;
}