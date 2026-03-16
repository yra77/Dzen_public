using System.Text;
using System.Text.Json;
using Comments.Application.Abstractions;
using Comments.Application.DTOs;
using RabbitMQ.Client;

namespace Comments.Api.Infrastructure;

public sealed class RabbitMqCommentCreatedPublisher : ICommentCreatedPublisher
{
    private readonly RabbitMqOptions _options;

    public RabbitMqCommentCreatedPublisher(RabbitMqOptions options)
    {
        _options = options;
    }

    public Task PublishAsync(CommentDto comment, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var factory = new ConnectionFactory
        {
            HostName = _options.HostName,
            Port = _options.Port,
            UserName = _options.UserName,
            Password = _options.Password
        };

        using var connection = factory.CreateConnection();
        using var channel = connection.CreateModel();

        channel.ExchangeDeclare(_options.ExchangeName, ExchangeType.Topic, durable: true, autoDelete: false);

        var payload = JsonSerializer.Serialize(comment);
        var body = Encoding.UTF8.GetBytes(payload);

        var properties = channel.CreateBasicProperties();
        properties.Persistent = true;

        channel.BasicPublish(
            exchange: _options.ExchangeName,
            routingKey: _options.RoutingKey,
            basicProperties: properties,
            body: body);

        return Task.CompletedTask;
    }
}
