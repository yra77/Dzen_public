using System.Text;
using System.Text.Json;
using Comments.Application.DTOs;
using Comments.Application.Abstractions;

namespace Comments.Infrastructure.Search;

/// <summary>
/// Канал публікації створених коментарів у Elasticsearch-індекс.
/// </summary>
public sealed class ElasticsearchCommentCreatedChannel : ICommentCreatedChannel
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);
    private readonly HttpClient _httpClient;
    private readonly ElasticsearchOptions _options;

    /// <summary>
    /// Ініціалізує Elasticsearch-канал із HTTP-клієнтом та налаштуваннями індексу.
    /// </summary>
    /// <param name="httpClient">HTTP-клієнт для звернення до Elasticsearch API.</param>
    /// <param name="options">Параметри індексації та імені індексу.</param>
    public ElasticsearchCommentCreatedChannel(HttpClient httpClient, ElasticsearchOptions options)
    {
        _httpClient = httpClient;
        _options = options;
    }

    /// <summary>
    /// Індексуює/оновлює документ коментаря в Elasticsearch за ID коментаря.
    /// </summary>
    /// <param name="comment">DTO створеного коментаря.</param>
    /// <param name="cancellationToken">Токен скасування.</param>
    public async Task PublishAsync(CommentDto comment, CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.Serialize(new
        {
            id = comment.Id,
            parentId = comment.ParentId,
            userName = comment.UserName,
            email = comment.Email,
            homePage = comment.HomePage,
            text = comment.Text,
            createdAtUtc = comment.CreatedAtUtc
        }, SerializerOptions);

        using var request = new HttpRequestMessage(HttpMethod.Put, $"/{_options.IndexName}/_doc/{comment.Id}?refresh=true")
        {
            Content = new StringContent(payload, Encoding.UTF8, "application/json")
        };

        await _httpClient.SendAsync(request, cancellationToken);
    }
}
