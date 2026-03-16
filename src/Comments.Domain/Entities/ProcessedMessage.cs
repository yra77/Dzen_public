namespace Comments.Domain.Entities;

public sealed class ProcessedMessage
{
    private ProcessedMessage()
    {
    }

    public ProcessedMessage(string id, DateTime processedAtUtc)
    {
        Id = id;
        ProcessedAtUtc = processedAtUtc;
    }

    public string Id { get; private set; } = string.Empty;
    public DateTime ProcessedAtUtc { get; private set; }
}
