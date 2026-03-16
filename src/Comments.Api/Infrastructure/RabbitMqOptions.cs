namespace Comments.Api.Infrastructure;

public sealed class RabbitMqOptions
{
    public bool Enabled { get; init; }
    public bool ConsumerEnabled { get; init; } = true;
    public string HostName { get; init; } = "localhost";
    public int Port { get; init; } = 5672;
    public string UserName { get; init; } = "guest";
    public string Password { get; init; } = "guest";
    public string ExchangeName { get; init; } = "comments.events";
    public string RoutingKey { get; init; } = "comment.created";
    public string IndexingQueueName { get; init; } = "indexing";
    public string FileProcessingQueueName { get; init; } = "file-processing";
    public string IndexingRoutingKey { get; init; } = "comment.created.indexing";
    public string FileProcessingRoutingKey { get; init; } = "comment.created.file-processing";
}
