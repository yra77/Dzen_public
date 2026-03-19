using Comments.Application.Abstractions;
using Microsoft.Extensions.Hosting;

namespace Comments.Infrastructure.Search;

public sealed class ElasticsearchBackfillHostedService : IHostedService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ElasticsearchOptions _options;
    private readonly ILogger<ElasticsearchBackfillHostedService> _logger;

    public ElasticsearchBackfillHostedService(
        IServiceProvider serviceProvider,
        ElasticsearchOptions options,
        ILogger<ElasticsearchBackfillHostedService> logger)
    {
        _serviceProvider = serviceProvider;
        _options = options;
        _logger = logger;
    }

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
            var dto = new Comments.Application.DTOs.CommentDto(
                comment.Id,
                comment.ParentId,
                comment.UserName,
                comment.Email,
                comment.HomePage,
                comment.Text,
                comment.CreatedAtUtc,
                null,
                Array.Empty<Comments.Application.DTOs.CommentDto>());

            await elasticChannel.PublishAsync(dto, cancellationToken);
        }

        _logger.LogInformation("Elasticsearch backfill completed.");
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
