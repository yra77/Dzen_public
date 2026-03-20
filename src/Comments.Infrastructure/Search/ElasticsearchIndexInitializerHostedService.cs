using Elastic.Clients.Elasticsearch;
using Elastic.Clients.Elasticsearch.IndexManagement;

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
        var existsResponse = await _client.Indices.ExistsAsync(_options.IndexName, cancellationToken);
        if (existsResponse.Exists)
        {
            return;
        }

        var createResponse = await _client.Indices.CreateAsync(_options.IndexName, descriptor => descriptor
            .Settings(settings => settings.NumberOfShards(1).NumberOfReplicas(0))
            .Mappings<MapOfCommentSearchDocument>(), cancellationToken);

        if (!createResponse.IsValidResponse)
        {
            var errorMessage = createResponse.ElasticsearchServerError?.ToString() ?? "unknown error";
            throw new InvalidOperationException($"Failed to create Elasticsearch index '{_options.IndexName}': {errorMessage}");
        }

        _logger.LogInformation("Created Elasticsearch index {IndexName} with typed mapping.", _options.IndexName);
    }

    /// <summary>
    /// Для цього сервісу додаткова зупинка не потрібна.
    /// </summary>
    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}

/// <summary>
/// Допоміжний typed mapping для індексу коментарів.
/// </summary>
internal sealed class MapOfCommentSearchDocument : TypeMapping
{
    /// <summary>
    /// Конструює мапінг полів документу коментаря.
    /// </summary>
    public MapOfCommentSearchDocument()
    {
        Properties = new Properties(new Dictionary<PropertyName, IProperty>
        {
            [nameof(CommentSearchDocument.Id)] = new KeywordProperty(),
            [nameof(CommentSearchDocument.ParentId)] = new KeywordProperty(),
            [nameof(CommentSearchDocument.UserName)] = new TextProperty(),
            [nameof(CommentSearchDocument.Email)] = new TextProperty(),
            [nameof(CommentSearchDocument.HomePage)] = new KeywordProperty(),
            [nameof(CommentSearchDocument.Text)] = new TextProperty(),
            [nameof(CommentSearchDocument.CreatedAtUtc)] = new DateProperty()
        });
    }
}
