using Comments.Application.Abstractions;
using Comments.Application.DTOs;

using Elastic.Clients.Elasticsearch;

namespace Comments.Infrastructure.Search;

/// <summary>
/// Сервіс пошуку коментарів через офіційний Elasticsearch .NET client.
/// </summary>
public sealed class ElasticsearchCommentSearchService : ICommentSearchService
{
    private readonly ElasticsearchClient _client;
    private readonly ElasticsearchOptions _options;

    /// <summary>
    /// Ініціалізує сервіс пошуку із typed client Elasticsearch.
    /// </summary>
    /// <param name="client">Офіційний Elasticsearch .NET client.</param>
    /// <param name="options">Налаштування індексу.</param>
    public ElasticsearchCommentSearchService(ElasticsearchClient client, ElasticsearchOptions options)
    {
        _client = client;
        _options = options;
    }

    /// <summary>
    /// Виконує пагінований пошук коментарів за текстовим запитом.
    /// </summary>
    public async Task<PagedResult<CommentDto>> SearchAsync(string query, int page, int pageSize, CancellationToken cancellationToken)
    {
        var from = (page - 1) * pageSize;

        var response = await _client.SearchAsync<CommentSearchDocument>(request => request
            .Index(_options.IndexName)
            .From(from)
            .Size(pageSize)
            .Query(queryDescriptor => queryDescriptor
                .MultiMatch(multiMatchDescriptor => multiMatchDescriptor
                    .Query(query)
                    .Fields(new[] { "text", "userName", "email" })))
            .Sort(sortDescriptor => sortDescriptor
                .Field(field => field.CreatedAtUtc, fieldSortDescriptor => fieldSortDescriptor
                    .Order(SortOrder.Desc))), cancellationToken);

        if (!response.IsValidResponse)
        {
            var error = response.ElasticsearchServerError?.ToString() ?? "unknown error";
            throw new InvalidOperationException($"Elasticsearch search operation failed: {error}");
        }

        var items = response.Hits
            .Select(hit => hit.Source)
            .Where(source => source is not null)
            .Select(MapHit)
            .ToArray();

        var totalCountValue = response.HitsMetadata?.Total?.Match(
            totalHits => totalHits.Value,
            value => value) ?? 0;
        var totalCount = checked((int)totalCountValue);
        return new PagedResult<CommentDto>(page, pageSize, totalCount, items);
    }

    /// <summary>
    /// Мапить typed документ Elasticsearch у DTO коментаря.
    /// </summary>
    private static CommentDto MapHit(CommentSearchDocument source) => new(
        source.Id,
        source.ParentId,
        source.UserName,
        source.Email,
        source.HomePage,
        source.Text,
        source.CreatedAtUtc,
        null,
        Array.Empty<CommentDto>());
}
