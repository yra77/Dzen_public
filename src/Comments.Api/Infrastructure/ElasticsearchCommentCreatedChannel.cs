using System.Text;
using System.Text.Json;
using Comments.Application.DTOs;

namespace Comments.Api.Infrastructure;

public sealed class ElasticsearchCommentCreatedChannel : ICommentCreatedChannel
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);
    private readonly HttpClient _httpClient;
    private readonly ElasticsearchOptions _options;

    public ElasticsearchCommentCreatedChannel(HttpClient httpClient, ElasticsearchOptions options)
    {
        _httpClient = httpClient;
        _options = options;
    }

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
