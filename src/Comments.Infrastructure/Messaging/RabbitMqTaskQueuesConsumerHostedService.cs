

using Comments.Application.Abstractions;
using Comments.Application.DTOs;

using RabbitMQ.Client;
using RabbitMQ.Client.Events;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Hosting;

using System.Text;
using System.Text.Json;
using System.Diagnostics;
using System.Diagnostics.Metrics;


namespace Comments.Infrastructure.Messaging;
/// <summary>
/// Фоновий consumer RabbitMQ для черг індексації та обробки вкладень.
/// </summary>
public sealed class RabbitMqTaskQueuesConsumerHostedService : IHostedService, IDisposable
{


    private static readonly Meter ConsumerMeter = new("Comments.Infrastructure.RabbitMqConsumer");
    private static readonly Counter<long> SuccessCounter = ConsumerMeter.CreateCounter<long>(
        "comments_rabbitmq_consumer_success_total",
        unit: "messages",
        description: "Кількість успішно оброблених повідомлень consumer-ом RabbitMQ.");
    private static readonly Counter<long> FailedCounter = ConsumerMeter.CreateCounter<long>(
        "comments_rabbitmq_consumer_failed_total",
        unit: "messages",
        description: "Кількість помилок обробки повідомлень consumer-ом RabbitMQ.");
    private static readonly Counter<long> RetryCounter = ConsumerMeter.CreateCounter<long>(
        "comments_rabbitmq_consumer_retry_total",
        unit: "messages",
        description: "Кількість повторних публікацій повідомлень після помилки обробки.");
    private static readonly Histogram<double> LatencyHistogram = ConsumerMeter.CreateHistogram<double>(
        "comments_rabbitmq_consumer_latency_ms",
        unit: "ms",
        description: "Час обробки одного повідомлення consumer-ом RabbitMQ.");

    private readonly RabbitMqOptions _options;
    private readonly ILogger<RabbitMqTaskQueuesConsumerHostedService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    private IConnection? _connection;
    private IModel? _channel;
    private readonly Dictionary<string, WorkerAlertWindow> _alertWindows = new();


    public RabbitMqTaskQueuesConsumerHostedService(RabbitMqOptions options,
                                                   ILogger<RabbitMqTaskQueuesConsumerHostedService> logger,
                                                   IServiceScopeFactory scopeFactory)
    {
        _options = options;
        _logger = logger;
        _scopeFactory = scopeFactory;
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
        _channel.ExchangeDeclare(_options.DeadLetterExchangeName, ExchangeType.Direct, durable: true, autoDelete: false);

        var indexingArguments = CreateQueueArguments(_options.IndexingQueueName);
        var fileProcessingArguments = CreateQueueArguments(_options.FileProcessingQueueName);

        _channel.QueueDeclare(_options.IndexingQueueName, durable: true, exclusive: false, autoDelete: false, arguments: indexingArguments);
        _channel.QueueDeclare(_options.FileProcessingQueueName, durable: true, exclusive: false, autoDelete: false, arguments: fileProcessingArguments);

        var indexingDlqName = BuildDeadLetterQueueName(_options.IndexingQueueName);
        var fileProcessingDlqName = BuildDeadLetterQueueName(_options.FileProcessingQueueName);

        _channel.QueueDeclare(indexingDlqName, durable: true, exclusive: false, autoDelete: false, arguments: null);
        _channel.QueueDeclare(fileProcessingDlqName, durable: true, exclusive: false, autoDelete: false, arguments: null);

        _channel.QueueBind(_options.IndexingQueueName, _options.ExchangeName, _options.IndexingRoutingKey);
        _channel.QueueBind(_options.FileProcessingQueueName, _options.ExchangeName, _options.FileProcessingRoutingKey);

        _channel.QueueBind(indexingDlqName, _options.DeadLetterExchangeName, indexingDlqName);
        _channel.QueueBind(fileProcessingDlqName, _options.DeadLetterExchangeName, fileProcessingDlqName);

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

    /// <summary>
    /// Формує стандартні аргументи queue з налаштуванням dead-letter маршрутизації.
    /// </summary>
    private Dictionary<string, object> CreateQueueArguments(string queueName)
    {
        var deadLetterQueueName = BuildDeadLetterQueueName(queueName);
        return new Dictionary<string, object>
        {
            ["x-dead-letter-exchange"] = _options.DeadLetterExchangeName,
            ["x-dead-letter-routing-key"] = deadLetterQueueName
        };
    }

    /// <summary>
    /// Генерує ім'я DLQ для основної queue.
    /// </summary>
    private string BuildDeadLetterQueueName(string queueName) => $"{queueName}{_options.DeadLetterQueueSuffix}";

    /// <summary>
    /// Підписує RabbitMQ consumer на queue та виконує обробку повідомлень із retry/DLQ політикою.
    /// </summary>
    private void StartConsumer(string queueName, string workerName, Func<CommentDto, bool> processComment)
    {
        if (_channel is null)
        {
            throw new InvalidOperationException("RabbitMQ channel is not initialized.");
        }

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.Received += async (_, eventArgs) =>
        {
            var processingStartedAt = Stopwatch.GetTimestamp();
            try
            {
                var payload = Encoding.UTF8.GetString(eventArgs.Body.ToArray());
                var comment = JsonSerializer.Deserialize<CommentDto>(payload);

                if (comment is null)
                {
                    _logger.LogWarning("[{Worker}] Received empty or invalid payload", workerName);
                    var failedLatencyMs = RecordFailedProcessing(workerName, "invalid_payload", processingStartedAt);
                    EvaluateAndLogConsumerAlerts(workerName, wasSuccessful: false, failedLatencyMs);
                    _channel.BasicNack(eventArgs.DeliveryTag, multiple: false, requeue: false);
                    return;
                }

                var messageId = eventArgs.BasicProperties?.MessageId;
                if (!string.IsNullOrWhiteSpace(messageId))
                {
                    await using var scope = _scopeFactory.CreateAsyncScope();
                    var processedRepo = scope.ServiceProvider.GetRequiredService<IProcessedMessageRepository>();
                    var marked = await processedRepo.TryMarkProcessedAsync(messageId, CancellationToken.None);
                    if (!marked)
                    {
                        _logger.LogInformation("[{Worker}] Skipping duplicate message {MessageId}", workerName, messageId);
                        var duplicateLatencyMs = RecordSuccessProcessing(workerName, "duplicate", processingStartedAt);
                        EvaluateAndLogConsumerAlerts(workerName, wasSuccessful: true, duplicateLatencyMs);
                        _channel.BasicAck(eventArgs.DeliveryTag, multiple: false);
                        return;
                    }
                }

                var hasAttachment = processComment(comment);
                if (workerName == "file-processing" && !hasAttachment)
                {
                    _logger.LogInformation("[file-processing] skipped comment {CommentId} without attachment", comment.Id);
                }

                var successLatencyMs = RecordSuccessProcessing(workerName, "processed", processingStartedAt);
                EvaluateAndLogConsumerAlerts(workerName, wasSuccessful: true, successLatencyMs);
                _channel.BasicAck(eventArgs.DeliveryTag, multiple: false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[{Worker}] Failed to process message", workerName);
                var exceptionLatencyMs = RecordFailedProcessing(workerName, "exception", processingStartedAt);
                EvaluateAndLogConsumerAlerts(workerName, wasSuccessful: false, exceptionLatencyMs);

                var retryCount = ReadRetryCount(eventArgs.BasicProperties?.Headers);
                if (retryCount >= _options.MaxRetryCount)
                {
                    _logger.LogWarning("[{Worker}] Retry limit reached ({MaxRetryCount}). Sending message to DLQ.", workerName, _options.MaxRetryCount);
                    _channel.BasicNack(eventArgs.DeliveryTag, multiple: false, requeue: false);
                    return;
                }

                var updatedProperties = _channel.CreateBasicProperties();
                updatedProperties.Persistent = true;
                updatedProperties.MessageId = eventArgs.BasicProperties?.MessageId ?? Guid.NewGuid().ToString("N");
                updatedProperties.ContentType = eventArgs.BasicProperties?.ContentType;
                updatedProperties.Headers = eventArgs.BasicProperties?.Headers is null
                    ? new Dictionary<string, object>()
                    : new Dictionary<string, object>(eventArgs.BasicProperties.Headers);

                updatedProperties.Headers[_options.RetryHeaderName] = retryCount + 1;
                RetryCounter.Add(1, new KeyValuePair<string, object?>("worker", workerName));

                _channel.BasicPublish(
                    exchange: _options.ExchangeName,
                    routingKey: eventArgs.RoutingKey,
                    basicProperties: updatedProperties,
                    body: eventArgs.Body);

                _channel.BasicAck(eventArgs.DeliveryTag, multiple: false);
            }
        };

        _channel.BasicConsume(queue: queueName, autoAck: false, consumer: consumer);
    }

    /// <summary>
    /// Зчитує поточний retry-лічильник із headers повідомлення.
    /// </summary>
    private int ReadRetryCount(IDictionary<string, object>? headers)
    {
        if (headers is null || !headers.TryGetValue(_options.RetryHeaderName, out var value))
        {
            return 0;
        }

        return value switch
        {
            byte b => b,
            sbyte sb => sb,
            short s => s,
            ushort us => us,
            int i => i,
            uint ui => (int)ui,
            long l => (int)l,
            ulong ul => (int)ul,
            byte[] bytes when int.TryParse(Encoding.UTF8.GetString(bytes), out var parsed) => parsed,
            _ => 0
        };
    }

    /// <summary>
    /// Реєструє успішну обробку повідомлення та її latency.
    /// </summary>
    private static double RecordSuccessProcessing(string workerName, string outcome, long startedAtTimestamp)
    {
        var elapsedMs = Stopwatch.GetElapsedTime(startedAtTimestamp).TotalMilliseconds;

        SuccessCounter.Add(
            1,
            new KeyValuePair<string, object?>("worker", workerName),
            new KeyValuePair<string, object?>("outcome", outcome));

        LatencyHistogram.Record(
            elapsedMs,
            new KeyValuePair<string, object?>("worker", workerName),
            new KeyValuePair<string, object?>("result", "success"));

        return elapsedMs;
    }

    /// <summary>
    /// Реєструє помилку обробки повідомлення та її latency.
    /// </summary>
    private static double RecordFailedProcessing(string workerName, string reason, long startedAtTimestamp)
    {
        var elapsedMs = Stopwatch.GetElapsedTime(startedAtTimestamp).TotalMilliseconds;

        FailedCounter.Add(
            1,
            new KeyValuePair<string, object?>("worker", workerName),
            new KeyValuePair<string, object?>("reason", reason));

        LatencyHistogram.Record(
            elapsedMs,
            new KeyValuePair<string, object?>("worker", workerName),
            new KeyValuePair<string, object?>("result", "failed"));

        return elapsedMs;
    }


    /// <summary>
    /// Оновлює ковзне вікно обробки для worker-а та логуює alert-події за порогами failure-rate/latency.
    /// </summary>
    private void EvaluateAndLogConsumerAlerts(string workerName, bool wasSuccessful, double latencyMs)
    {
        var windowSize = Math.Max(1, _options.Alerts.WindowSize);

        if (!_alertWindows.TryGetValue(workerName, out var alertWindow))
        {
            alertWindow = new WorkerAlertWindow(windowSize);
            _alertWindows[workerName] = alertWindow;
        }

        var stats = alertWindow.RegisterResult(wasSuccessful, latencyMs);
        if (!stats.IsWindowFilled)
        {
            return;
        }

        if (stats.FailureRatePercent >= _options.Alerts.CriticalFailureRatePercent ||
            stats.AverageLatencyMs >= _options.Alerts.CriticalAverageLatencyMs)
        {
            _logger.LogError(
                "[{Worker}] RabbitMQ consumer CRITICAL threshold exceeded: failureRate={FailureRatePercent:F2}% (>= {CriticalFailureRatePercent:F2}%) avgLatency={AverageLatencyMs:F2}ms (>= {CriticalAverageLatencyMs:F2}ms) over last {WindowSize} messages",
                workerName,
                stats.FailureRatePercent,
                _options.Alerts.CriticalFailureRatePercent,
                stats.AverageLatencyMs,
                _options.Alerts.CriticalAverageLatencyMs,
                stats.WindowSize);
            return;
        }

        if (stats.FailureRatePercent >= _options.Alerts.WarningFailureRatePercent ||
            stats.AverageLatencyMs >= _options.Alerts.WarningAverageLatencyMs)
        {
            _logger.LogWarning(
                "[{Worker}] RabbitMQ consumer WARNING threshold exceeded: failureRate={FailureRatePercent:F2}% (>= {WarningFailureRatePercent:F2}%) avgLatency={AverageLatencyMs:F2}ms (>= {WarningAverageLatencyMs:F2}ms) over last {WindowSize} messages",
                workerName,
                stats.FailureRatePercent,
                _options.Alerts.WarningFailureRatePercent,
                stats.AverageLatencyMs,
                _options.Alerts.WarningAverageLatencyMs,
                stats.WindowSize);
        }
    }

    /// <summary>
    /// Агреговані показники ковзного вікна обробки повідомлень worker-а.
    /// </summary>
    private readonly record struct WorkerAlertStats(bool IsWindowFilled, int WindowSize, double FailureRatePercent, double AverageLatencyMs);

    /// <summary>
    /// Потікобезпечне ковзне вікно останніх результатів обробки повідомлень конкретного worker-а.
    /// </summary>
    private sealed class WorkerAlertWindow
    {
        private readonly object _syncRoot = new();
        private readonly Queue<bool> _successResults;
        private readonly Queue<double> _latenciesMs;
        private readonly int _windowSize;

        /// <summary>
        /// Ініціалізує вікно агрегації з фіксованим розміром.
        /// </summary>
        public WorkerAlertWindow(int windowSize)
        {
            _windowSize = windowSize;
            _successResults = new Queue<bool>(windowSize);
            _latenciesMs = new Queue<double>(windowSize);
        }

        /// <summary>
        /// Додає новий результат обробки та повертає поточні агреговані метрики вікна.
        /// </summary>
        public WorkerAlertStats RegisterResult(bool wasSuccessful, double latencyMs)
        {
            lock (_syncRoot)
            {
                _successResults.Enqueue(wasSuccessful);
                _latenciesMs.Enqueue(latencyMs);

                if (_successResults.Count > _windowSize)
                {
                    _successResults.Dequeue();
                    _latenciesMs.Dequeue();
                }

                var isWindowFilled = _successResults.Count == _windowSize;
                var failures = _successResults.Count(result => !result);
                var failureRatePercent = _successResults.Count == 0 ? 0 : failures * 100d / _successResults.Count;
                var averageLatencyMs = _latenciesMs.Count == 0 ? 0 : _latenciesMs.Average();

                return new WorkerAlertStats(isWindowFilled, _successResults.Count, failureRatePercent, averageLatencyMs);
            }
        }
    }

    public void Dispose()
    {
        _channel?.Dispose();
        _connection?.Dispose();
    }
}
