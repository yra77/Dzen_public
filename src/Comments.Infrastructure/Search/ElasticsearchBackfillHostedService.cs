using Comments.Application.Abstractions;
using Comments.Application.DTOs;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Comments.Infrastructure.Search;

/// <summary>
/// Hosted service для початкового backfill індексації коментарів у Elasticsearch.
/// </summary>
public sealed class ElasticsearchBackfillHostedService : IHostedService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ElasticsearchOptions _options;
    private readonly ILogger<ElasticsearchBackfillHostedService> _logger;

    /// <summary>
    /// Ініціалізує backfill-сервіс із доступом до репозиторію коментарів та каналу індексації.
    /// </summary>
    public ElasticsearchBackfillHostedService(
        IServiceProvider serviceProvider,
        ElasticsearchOptions options,
        ILogger<ElasticsearchBackfillHostedService> logger)
    {
        _serviceProvider = serviceProvider;
        _options = options;
        _logger = logger;
    }

    /// <summary>
    /// На старті застосунку виконує одноразову індексацію існуючих коментарів.
    /// </summary>
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!_options.BackfillOnStartup)
        {
            return;
        }

        using var scope = _serviceProvider.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<ICommentRepository>();
        var elasticChannel = scope.ServiceProvider.GetRequiredService<ElasticsearchCommentCreatedChannel>();

        var comments = await repository.GetAllAsync(cancellationToken);
        if (comments.Count == 0)
        {
            return;
        }

        _logger.LogInformation("Starting Elasticsearch backfill for {Count} comments.", comments.Count);

        foreach (var comment in comments)
        {
            var dto = new CommentDto(
                comment.Id,
                comment.ParentId,
                comment.UserName,
                comment.Email,
                comment.HomePage,
                comment.Text,
                comment.CreatedAtUtc,
                null,
                Array.Empty<CommentDto>());

            await elasticChannel.PublishAsync(dto, cancellationToken);
        }

        _logger.LogInformation("Elasticsearch backfill completed.");
    }

    /// <summary>
    /// Для цього сервісу додаткова логіка зупинки не потрібна.
    /// </summary>
    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}