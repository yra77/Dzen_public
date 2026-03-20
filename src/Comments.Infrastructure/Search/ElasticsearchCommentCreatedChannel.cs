using Comments.Application.Abstractions;
using Comments.Application.DTOs;

using Elastic.Clients.Elasticsearch;
using Elastic.Clients.Elasticsearch.Core.Indexing;

namespace Comments.Infrastructure.Search;

/// <summary>
/// Канал публікації створених коментарів у Elasticsearch-індекс через офіційний .NET client.
/// </summary>
public sealed class ElasticsearchCommentCreatedChannel : ICommentCreatedChannel
{
    private readonly ElasticsearchClient _client;
    private readonly ElasticsearchOptions _options;

    /// <summary>
    /// Ініціалізує Elasticsearch-канал із typed client та налаштуваннями індексу.
    /// </summary>
    /// <param name="client">Офіційний Elasticsearch .NET client.</param>
    /// <param name="options">Параметри індексації та імені індексу.</param>
    public ElasticsearchCommentCreatedChannel(ElasticsearchClient client, ElasticsearchOptions options)
    {
        _client = client;
        _options = options;
    }

    /// <summary>
    /// Індексуює/оновлює документ коментаря в Elasticsearch за ID коментаря.
    /// </summary>
    /// <param name="comment">DTO створеного коментаря.</param>
    /// <param name="cancellationToken">Токен скасування.</param>
    public async Task PublishAsync(CommentDto comment, CancellationToken cancellationToken)
    {
        var document = ToDocument(comment);
        var response = await _client.IndexAsync(document, request => request
            .Index(_options.IndexName)
            .Id(comment.Id)
            .Refresh(Refresh.True), cancellationToken);

        if (!response.IsValidResponse)
        {
            var error = response.ElasticsearchServerError?.ToString() ?? "unknown error";
            throw new InvalidOperationException($"Elasticsearch index operation failed: {error}");
        }
    }

    /// <summary>
    /// Перетворює DTO коментаря в typed документ Elasticsearch.
    /// </summary>
    private static CommentSearchDocument ToDocument(CommentDto comment) => new()
    {
        Id = comment.Id,
        ParentId = comment.ParentId,
        UserName = comment.UserName,
        Email = comment.Email,
        HomePage = comment.HomePage,
        Text = comment.Text,
        CreatedAtUtc = comment.CreatedAtUtc
    };
}
