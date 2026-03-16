using System.Text;
using System.Text.Json;
using Comments.Application.DTOs;
using Microsoft.Extensions.Hosting;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace Comments.Api.Infrastructure;

public sealed class RabbitMqTaskQueuesConsumerHostedService : IHostedService, IDisposable
{
    private readonly RabbitMqOptions _options;
    private readonly ILogger<RabbitMqTaskQueuesConsumerHostedService> _logger;

    private IConnection? _connection;
    private IModel? _channel;

    public RabbitMqTaskQueuesConsumerHostedService(
        RabbitMqOptions options,
        ILogger<RabbitMqTaskQueuesConsumerHostedService> logger)
    {
        _options = options;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var factory = new ConnectionFactory
        {
            HostName = _options.HostName,
            Port = _options.Port,
            UserName = _options.UserName,
            Password = _options.Password
        };

        _connection = factory.CreateConnection();
        _channel = _connection.CreateModel();

        _channel.ExchangeDeclare(_options.ExchangeName, ExchangeType.Topic, durable: true, autoDelete: false);

        _channel.QueueDeclare(_options.IndexingQueueName, durable: true, exclusive: false, autoDelete: false, arguments: null);
        _channel.QueueDeclare(_options.FileProcessingQueueName, durable: true, exclusive: false, autoDelete: false, arguments: null);

        _channel.QueueBind(_options.IndexingQueueName, _options.ExchangeName, _options.IndexingRoutingKey);
        _channel.QueueBind(_options.FileProcessingQueueName, _options.ExchangeName, _options.FileProcessingRoutingKey);

        _channel.BasicQos(prefetchSize: 0, prefetchCount: 10, global: false);

        StartConsumer(
            queueName: _options.IndexingQueueName,
            workerName: "indexing",
            processComment: comment =>
            {
                _logger.LogInformation("[indexing] processed comment {CommentId} for search indexing", comment.Id);
                return comment.Attachment is not null;
            });

        StartConsumer(
            queueName: _options.FileProcessingQueueName,
            workerName: "file-processing",
            processComment: comment =>
            {
                _logger.LogInformation("[file-processing] processed attachment for comment {CommentId}", comment.Id);
                return comment.Attachment is not null;
            });

        _logger.LogInformation("RabbitMQ task queue consumers started ({IndexingQueue}, {FileProcessingQueue})",
            _options.IndexingQueueName,
            _options.FileProcessingQueueName);

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        Dispose();
        _logger.LogInformation("RabbitMQ task queue consumers stopped");
        return Task.CompletedTask;
    }

    private void StartConsumer(string queueName, string workerName, Func<CommentDto, bool> processComment)
    {
        if (_channel is null)
        {
            throw new InvalidOperationException("RabbitMQ channel is not initialized.");
        }

        var consumer = new EventingBasicConsumer(_channel);
        consumer.Received += (_, eventArgs) =>
        {
            try
            {
                var payload = Encoding.UTF8.GetString(eventArgs.Body.ToArray());
                var comment = JsonSerializer.Deserialize<CommentDto>(payload);

                if (comment is null)
                {
                    _logger.LogWarning("[{Worker}] Received empty or invalid payload", workerName);
                    _channel.BasicNack(eventArgs.DeliveryTag, multiple: false, requeue: false);
                    return;
                }

                var hasAttachment = processComment(comment);
                if (workerName == "file-processing" && !hasAttachment)
                {
                    _logger.LogInformation("[file-processing] skipped comment {CommentId} without attachment", comment.Id);
                }

                _channel.BasicAck(eventArgs.DeliveryTag, multiple: false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[{Worker}] Failed to process message", workerName);
                _channel.BasicNack(eventArgs.DeliveryTag, multiple: false, requeue: true);
            }
        };

        _channel.BasicConsume(queue: queueName, autoAck: false, consumer: consumer);
    }

    public void Dispose()
    {
        _channel?.Dispose();
        _connection?.Dispose();
    }
}
