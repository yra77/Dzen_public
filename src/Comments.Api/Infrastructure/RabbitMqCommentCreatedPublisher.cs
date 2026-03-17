using System.Text;
using System.Text.Json;
using Comments.Application.DTOs;
using RabbitMQ.Client;

namespace Comments.Api.Infrastructure;

/// <summary>
/// Канал публікації події створення коментаря в RabbitMQ exchange/queues.
/// </summary>
public sealed class RabbitMqCommentCreatedPublisher : ICommentCreatedChannel
{
    private readonly RabbitMqOptions _options;

    /// <summary>
    /// Ініціалізує RabbitMQ-паблішер із параметрами підключення та маршрутизації.
    /// </summary>
    /// <param name="options">Налаштування хоста, exchange, queue та routing key.</param>
    public RabbitMqCommentCreatedPublisher(RabbitMqOptions options)
    {
        _options = options;
    }

    /// <summary>
    /// Публікує повідомлення про створення коментаря в загальну та спеціалізовані черги обробки.
    /// </summary>
    /// <param name="comment">DTO створеного коментаря.</param>
    /// <param name="cancellationToken">Токен скасування.</param>
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

        channel.QueueDeclare(_options.IndexingQueueName, durable: true, exclusive: false, autoDelete: false, arguments: null);
        channel.QueueDeclare(_options.FileProcessingQueueName, durable: true, exclusive: false, autoDelete: false, arguments: null);

        channel.QueueBind(_options.IndexingQueueName, _options.ExchangeName, _options.IndexingRoutingKey);
        channel.QueueBind(_options.FileProcessingQueueName, _options.ExchangeName, _options.FileProcessingRoutingKey);

        var payload = JsonSerializer.Serialize(comment);
        var body = Encoding.UTF8.GetBytes(payload);

        var properties = channel.CreateBasicProperties();
        properties.Persistent = true;
        properties.ContentType = "application/json";
        properties.MessageId = Guid.NewGuid().ToString("N");
        properties.Headers = new Dictionary<string, object>
        {
            [_options.RetryHeaderName] = 0
        };

        channel.BasicPublish(
            exchange: _options.ExchangeName,
            routingKey: _options.RoutingKey,
            basicProperties: properties,
            body: body);

        channel.BasicPublish(
            exchange: _options.ExchangeName,
            routingKey: _options.IndexingRoutingKey,
            basicProperties: properties,
            body: body);

        if (comment.Attachment is not null)
        {
            channel.BasicPublish(
                exchange: _options.ExchangeName,
                routingKey: _options.FileProcessingRoutingKey,
                basicProperties: properties,
                body: body);
        }

        return Task.CompletedTask;
    }
}
