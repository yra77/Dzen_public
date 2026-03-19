namespace Comments.Infrastructure.Maintenance;

/// <summary>
/// Налаштування фонової очистки таблиці ідемпотентності ProcessedMessages.
/// </summary>
public sealed class ProcessedMessageCleanupOptions
{
    /// <summary>
    /// Назва конфігураційної секції.
    /// </summary>
    public const string SectionName = "ProcessedMessageCleanup";

    /// <summary>
    /// Ознака увімкнення фонової очистки.
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Інтервал між запусками cleanup-процедури у хвилинах.
    /// </summary>
    public int IntervalMinutes { get; set; } = 60;

    /// <summary>
    /// TTL запису у годинах: все старіше буде видалено.
    /// </summary>
    public int RetentionHours { get; set; } = 168;
}
