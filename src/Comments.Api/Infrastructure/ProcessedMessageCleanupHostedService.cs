using Comments.Application.Abstractions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Comments.Api.Infrastructure;

/// <summary>
/// Періодично очищає застарілі записи ідемпотентності з persistent-сховища.
/// </summary>
public sealed class ProcessedMessageCleanupHostedService : BackgroundService
{
    private readonly ILogger<ProcessedMessageCleanupHostedService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ProcessedMessageCleanupOptions _options;

    /// <summary>
    /// Створює сервіс періодичної очистки ProcessedMessages.
    /// </summary>
    public ProcessedMessageCleanupHostedService(
        ILogger<ProcessedMessageCleanupHostedService> logger,
        IServiceScopeFactory scopeFactory,
        ProcessedMessageCleanupOptions options)
    {
        _logger = logger;
        _scopeFactory = scopeFactory;
        _options = options;
    }

    /// <summary>
    /// Виконує cleanup-цикл із заданим інтервалом.
    /// </summary>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation("Processed message cleanup is disabled.");
            return;
        }

        var interval = TimeSpan.FromMinutes(Math.Max(1, _options.IntervalMinutes));
        var retention = TimeSpan.FromHours(Math.Max(1, _options.RetentionHours));

        _logger.LogInformation(
            "Processed message cleanup started. Interval: {Interval}, Retention: {Retention}",
            interval,
            retention);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var olderThanUtc = DateTime.UtcNow.Subtract(retention);
                await using var scope = _scopeFactory.CreateAsyncScope();
                var repository = scope.ServiceProvider.GetRequiredService<IProcessedMessageRepository>();
                var deleted = await repository.CleanupOlderThanAsync(olderThanUtc, stoppingToken);

                _logger.LogInformation(
                    "Processed message cleanup finished. Deleted {DeletedCount} records older than {OlderThanUtc}.",
                    deleted,
                    olderThanUtc);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Processed message cleanup iteration failed.");
            }

            try
            {
                await Task.Delay(interval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }
}
