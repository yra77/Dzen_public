namespace Comments.Api.Infrastructure;

public sealed class RabbitMqOptions
{
    public bool Enabled { get; init; }
    public string HostName { get; init; } = "localhost";
    public int Port { get; init; } = 5672;
    public string UserName { get; init; } = "guest";
    public string Password { get; init; } = "guest";
    public string ExchangeName { get; init; } = "comments.events";
    public string RoutingKey { get; init; } = "comment.created";
}
