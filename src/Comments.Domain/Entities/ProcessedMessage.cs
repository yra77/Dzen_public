namespace Comments.Domain.Entities;

/// <summary>
/// Сутність факту обробки повідомлення для забезпечення ідемпотентності consumer-пайплайна.
/// </summary>
public sealed class ProcessedMessage
{
    private ProcessedMessage()
    {
    }

    /// <summary>
    /// Ініціалізує запис про успішно оброблене повідомлення.
    /// </summary>
    public ProcessedMessage(string id, DateTime processedAtUtc)
    {
        Id = id;
        ProcessedAtUtc = processedAtUtc;
    }

    /// <summary>
    /// Стабільний ідентифікатор повідомлення з брокера.
    /// </summary>
    public string Id { get; private set; } = string.Empty;

    /// <summary>
    /// Час (UTC), коли повідомлення було відмічене як оброблене.
    /// </summary>
    public DateTime ProcessedAtUtc { get; private set; }
}
