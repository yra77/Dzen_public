using Elastic.Clients.Elasticsearch;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Comments.Infrastructure.Search;

/// <summary>
/// Hosted service, що гарантує наявність typed-індексу та мапінгу Elasticsearch.
/// </summary>
public sealed class ElasticsearchIndexInitializerHostedService : IHostedService
{
    private readonly ElasticsearchClient _client;
    private readonly ElasticsearchOptions _options;
    private readonly ILogger<ElasticsearchIndexInitializerHostedService> _logger;

    /// <summary>
    /// Ініціалізує сервіс створення/перевірки індексу.
    /// </summary>
    public ElasticsearchIndexInitializerHostedService(
        ElasticsearchClient client,
        ElasticsearchOptions options,
        ILogger<ElasticsearchIndexInitializerHostedService> logger)
    {
        _client = client;
        _options = options;
        _logger = logger;
    }

    /// <summary>
    /// На старті застосунку створює індекс і typed mapping, якщо індекс ще не існує.
    /// </summary>
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            var existsResponse = await _client.Indices.ExistsAsync(_options.IndexName, cancellationToken);
            if (existsResponse.Exists)
            {
                return;
            }

            var createResponse = await _client.Indices.CreateAsync(_options.IndexName, descriptor => descriptor
                .Settings(settings => settings.NumberOfShards(1).NumberOfReplicas(0)), cancellationToken);

            if (!createResponse.IsValidResponse)
            {
                var errorMessage = createResponse.ElasticsearchServerError?.ToString()
                                   ?? createResponse.DebugInformation
                                   ?? "unknown error";

                throw new InvalidOperationException(
                    $"Failed to create Elasticsearch index '{_options.IndexName}': {errorMessage}");
            }

            _logger.LogInformation("Created Elasticsearch index {IndexName} with typed mapping.", _options.IndexName);
        }
        catch (Exception ex) when (!_options.FailStartupOnIndexInitializationError)
        {
            _logger.LogError(
                ex,
                "Elasticsearch index initialization failed for index {IndexName}. " +
                "Application startup will continue because {OptionName}=false.",
                _options.IndexName,
                nameof(ElasticsearchOptions.FailStartupOnIndexInitializationError));
        }
    }

    /// <summary>
    /// Для цього сервісу додаткова зупинка не потрібна.
    /// </summary>
    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
