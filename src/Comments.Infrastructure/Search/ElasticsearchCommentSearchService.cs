using System.Text;
using System.Text.Json;
using Comments.Application.Abstractions;
using Comments.Application.DTOs;

namespace Comments.Infrastructure.Search;

public sealed class ElasticsearchCommentSearchService : ICommentSearchService
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);
    private readonly HttpClient _httpClient;
    private readonly ElasticsearchOptions _options;

    public ElasticsearchCommentSearchService(HttpClient httpClient, ElasticsearchOptions options)
    {
        _httpClient = httpClient;
        _options = options;
    }

    public async Task<PagedResult<CommentDto>> SearchAsync(
        string query,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var from = (page - 1) * pageSize;

        var payload = JsonSerializer.Serialize(new
        {
            from,
            size = pageSize,
            query = new
            {
                multi_match = new
                {
                    query,
                    fields = new[] { "text", "userName", "email" }
                }
            },
            sort = new object[]
            {
                new { createdAtUtc = "desc" }
            }
        }, SerializerOptions);

        using var request = new HttpRequestMessage(HttpMethod.Post, $"/{_options.IndexName}/_search")
        {
            Content = new StringContent(payload, Encoding.UTF8, "application/json")
        };

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        await using var content = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(content, cancellationToken: cancellationToken);

        var totalCount = document.RootElement
            .GetProperty("hits")
            .GetProperty("total")
            .GetProperty("value")
            .GetInt32();

        var items = document.RootElement
            .GetProperty("hits")
            .GetProperty("hits")
            .EnumerateArray()
            .Select(MapHit)
            .ToArray();

        return new PagedResult<CommentDto>(page, pageSize, totalCount, items);
    }

    private static CommentDto MapHit(JsonElement hit)
    {
        var source = hit.GetProperty("_source");
        var id = source.GetProperty("id").GetGuid();

        Guid? parentId = null;
        if (source.TryGetProperty("parentId", out var parentElement) && parentElement.ValueKind != JsonValueKind.Null)
        {
            parentId = parentElement.GetGuid();
        }

        var homePage = source.TryGetProperty("homePage", out var homePageElement) && homePageElement.ValueKind != JsonValueKind.Null
            ? homePageElement.GetString()
            : null;

        return new CommentDto(
            id,
            parentId,
            source.GetProperty("userName").GetString() ?? string.Empty,
            source.GetProperty("email").GetString() ?? string.Empty,
            homePage,
            source.GetProperty("text").GetString() ?? string.Empty,
            source.GetProperty("createdAtUtc").GetDateTime(),
            null,
            Array.Empty<CommentDto>());
    }
}
