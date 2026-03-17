namespace Comments.Api.Infrastructure;

/// <summary>
/// Параметри інтеграції з RabbitMQ для publisher/consumer пайплайнів.
/// </summary>
public sealed class RabbitMqOptions
{
    /// <summary>
    /// Увімкнення/вимкнення RabbitMQ-інтеграції загалом.
    /// </summary>
    public bool Enabled { get; init; }

    /// <summary>
    /// Увімкнення hosted consumer для черг технічної обробки.
    /// </summary>
    public bool ConsumerEnabled { get; init; } = true;

    /// <summary>
    /// DNS-ім'я або IP брокера RabbitMQ.
    /// </summary>
    public string HostName { get; init; } = "localhost";

    /// <summary>
    /// TCP-порт AMQP брокера.
    /// </summary>
    public int Port { get; init; } = 5672;

    /// <summary>
    /// Користувач RabbitMQ.
    /// </summary>
    public string UserName { get; init; } = "guest";

    /// <summary>
    /// Пароль RabbitMQ-користувача.
    /// </summary>
    public string Password { get; init; } = "guest";

    /// <summary>
    /// Ім'я exchange для подій домену коментарів.
    /// </summary>
    public string ExchangeName { get; init; } = "comments.events";

    /// <summary>
    /// Базовий routing key для події створення коментаря.
    /// </summary>
    public string RoutingKey { get; init; } = "comment.created";

    /// <summary>
    /// Назва черги задач індексації пошуку.
    /// </summary>
    public string IndexingQueueName { get; init; } = "indexing";

    /// <summary>
    /// Назва черги задач обробки вкладень.
    /// </summary>
    public string FileProcessingQueueName { get; init; } = "file-processing";

    /// <summary>
    /// Routing key для доставлення задач індексації.
    /// </summary>
    public string IndexingRoutingKey { get; init; } = "comment.created.indexing";

    /// <summary>
    /// Routing key для задач обробки файлів.
    /// </summary>
    public string FileProcessingRoutingKey { get; init; } = "comment.created.file-processing";

    /// <summary>
    /// Ім'я dead-letter exchange для невдалих повідомлень.
    /// </summary>
    public string DeadLetterExchangeName { get; init; } = "comments.events.dlx";

    /// <summary>
    /// Суфікс DLQ-черг для базових робочих queue.
    /// </summary>
    public string DeadLetterQueueSuffix { get; init; } = ".dlq";

    /// <summary>
    /// Назва заголовка AMQP для лічильника retry-спроб.
    /// </summary>
    public string RetryHeaderName { get; init; } = "x-retry-count";

    /// <summary>
    /// Максимальна кількість retry перед переміщенням у DLQ.
    /// </summary>
    public int MaxRetryCount { get; init; } = 3;

    /// <summary>
    /// Параметри alert-порогів для оперативного моніторингу consumer-обробки.
    /// </summary>
    public RabbitMqConsumerAlertOptions Alerts { get; init; } = new();
}

/// <summary>
/// Конфігурація warning/critical порогів для логування аномалій RabbitMQ consumer.
/// </summary>
public sealed class RabbitMqConsumerAlertOptions
{
    /// <summary>
    /// Розмір ковзного вікна (кількість останніх повідомлень) для оцінки failure-rate та latency.
    /// </summary>
    public int WindowSize { get; init; } = 50;

    /// <summary>
    /// Поріг warning для відсотка failed-повідомлень у ковзному вікні.
    /// </summary>
    public double WarningFailureRatePercent { get; init; } = 5;

    /// <summary>
    /// Поріг critical для відсотка failed-повідомлень у ковзному вікні.
    /// </summary>
    public double CriticalFailureRatePercent { get; init; } = 15;

    /// <summary>
    /// Поріг warning для середньої latency обробки у ковзному вікні.
    /// </summary>
    public double WarningAverageLatencyMs { get; init; } = 250;

    /// <summary>
    /// Поріг critical для середньої latency обробки у ковзному вікні.
    /// </summary>
    public double CriticalAverageLatencyMs { get; init; } = 1000;
}
