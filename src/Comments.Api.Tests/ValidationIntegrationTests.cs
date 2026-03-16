using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Comments.Application.DTOs;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Comments.Api.Tests;

public sealed class ValidationIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public ValidationIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetComments_WithInvalidPageAndPageSize_ReturnsBadRequestValidationProblem()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/comments?page=0&pageSize=0");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ValidationProblemPayload>();
        Assert.NotNull(payload);
        Assert.Equal(400, payload!.Status);
        Assert.True(payload.Errors.ContainsKey("Page"));
        Assert.True(payload.Errors.ContainsKey("PageSize"));
    }

    [Fact]
    public async Task GetThread_WithEmptyGuid_ReturnsBadRequestValidationProblem()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync($"/api/comments/{Guid.Empty}/thread");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ValidationProblemPayload>();
        Assert.NotNull(payload);
        Assert.Equal(400, payload!.Status);
        Assert.True(payload.Errors.ContainsKey("RootCommentId"));
    }

    [Fact]
    public async Task Preview_WithTooLongText_ReturnsBadRequestValidationProblem()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/comments/preview", new
        {
            text = new string('x', 5001)
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ValidationProblemPayload>();
        Assert.NotNull(payload);
        Assert.Equal(400, payload!.Status);
        Assert.True(payload.Errors.ContainsKey("Text"));
    }

    [Fact]
    public async Task Preview_WithValidText_ReturnsSanitizedHtml()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/comments/preview", new
        {
            text = "Hello <strong>World</strong>"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<string>();
        Assert.Equal("Hello <strong>World</strong>", payload);
    }

    [Fact]
    public async Task CreateComment_WithInvalidCaptcha_ReturnsBadRequestValidationProblem()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/comments", new
        {
            userName = "User123",
            email = "user@example.com",
            homePage = "https://example.com",
            text = "Hello",
            parentId = (Guid?)null,
            captchaToken = "wrong-token",
            attachment = (object?)null
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ValidationProblemPayload>();
        Assert.NotNull(payload);
        Assert.Equal(400, payload!.Status);
        Assert.True(payload.Errors.ContainsKey("Request.CaptchaToken"));
    }

    [Fact]
    public async Task CreateComment_WithInvalidAttachmentBase64_ReturnsBadRequestValidationProblem()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/comments", new
        {
            userName = "User123",
            email = "user@example.com",
            homePage = "https://example.com",
            text = "Hello",
            parentId = (Guid?)null,
            captchaToken = "1234",
            attachment = new
            {
                fileName = "pic.png",
                contentType = "image/png",
                base64Content = "not-base64"
            }
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ValidationProblemPayload>();
        Assert.NotNull(payload);
        Assert.Equal(400, payload!.Status);
        Assert.True(payload.Errors.ContainsKey("Request.Attachment"));
    }

    [Fact]
    public async Task CreateComment_WithValidPayload_ReturnsCreatedComment()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/comments", new
        {
            userName = "User123",
            email = "user@example.com",
            homePage = "https://example.com",
            text = "Hello",
            parentId = (Guid?)null,
            captchaToken = "1234",
            attachment = (object?)null
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<CommentDto>();
        Assert.NotNull(payload);
        Assert.NotEqual(Guid.Empty, payload!.Id);
        Assert.Equal("User123", payload.UserName);
        Assert.Equal("Hello", payload.Text);
        Assert.Empty(payload.Replies);
    }

    [Fact]
    public async Task GetThread_WithCreatedReply_ReturnsTree()
    {
        using var client = _factory.CreateClient();

        var rootResponse = await client.PostAsJsonAsync("/api/comments", new
        {
            userName = "RootUser",
            email = "root@example.com",
            homePage = "https://example.com",
            text = "Root comment",
            parentId = (Guid?)null,
            captchaToken = "1234",
            attachment = (object?)null
        });

        Assert.Equal(HttpStatusCode.Created, rootResponse.StatusCode);
        var root = await rootResponse.Content.ReadFromJsonAsync<CommentDto>();
        Assert.NotNull(root);

        var replyResponse = await client.PostAsJsonAsync("/api/comments", new
        {
            userName = "ReplyUser",
            email = "reply@example.com",
            homePage = "https://example.com",
            text = "Reply comment",
            parentId = root!.Id,
            captchaToken = "1234",
            attachment = (object?)null
        });

        Assert.Equal(HttpStatusCode.Created, replyResponse.StatusCode);

        var threadResponse = await client.GetAsync($"/api/comments/{root.Id}/thread");
        Assert.Equal(HttpStatusCode.OK, threadResponse.StatusCode);

        var thread = await threadResponse.Content.ReadFromJsonAsync<CommentDto>();
        Assert.NotNull(thread);
        Assert.Equal(root.Id, thread!.Id);
        Assert.Single(thread.Replies);
        Assert.Equal("ReplyUser", thread.Replies.Single().UserName);
    }

    [Fact]
    public async Task Search_WithValidInput_ReturnsPagedShape()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/comments/search?q=hello&page=1&pageSize=10");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<PagedResult<CommentDto>>();
        Assert.NotNull(payload);
        Assert.Equal(1, payload!.Page);
        Assert.Equal(10, payload.PageSize);
        Assert.True(payload.TotalCount >= 0);
        Assert.NotNull(payload.Items);
    }

    [Fact]
    public async Task GraphQlSearchComments_WithInvalidInput_ReturnsBadUserInputError()
    {
        using var client = _factory.CreateClient();

        var body = new
        {
            query = "query { searchComments(q: \"\", page: 0, pageSize: 0) { totalCount items { id } } }"
        };

        var response = await client.PostAsJsonAsync("/graphql", body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<GraphQlResponse>();
        Assert.NotNull(payload);
        Assert.NotNull(payload!.Errors);
        Assert.NotEmpty(payload.Errors!);
        Assert.Equal("BAD_USER_INPUT", payload.Errors![0].Extensions?.Code);
        Assert.NotNull(payload.Errors![0].Extensions?.ValidationErrors);
        Assert.True(payload.Errors![0].Extensions!.ValidationErrors!.ContainsKey("Page"));
        Assert.True(payload.Errors![0].Extensions!.ValidationErrors!.ContainsKey("PageSize"));
    }

    [Fact]
    public async Task GraphQlCreateComment_WithInvalidCaptcha_ReturnsBadUserInputError()
    {
        using var client = _factory.CreateClient();

        var body = new
        {
            query = @"mutation {
  addComment(input: {
    userName: \"User123\",
    email: \"user@example.com\",
    homePage: \"https://example.com\",
    text: \"Hello\",
    captchaToken: \"wrong-token\"
  }) {
    id
  }
}"
        };

        var response = await client.PostAsJsonAsync("/graphql", body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<GraphQlResponse>();
        Assert.NotNull(payload);
        Assert.NotNull(payload!.Errors);
        Assert.NotEmpty(payload.Errors!);
        Assert.Equal("BAD_USER_INPUT", payload.Errors![0].Extensions?.Code);
        Assert.NotNull(payload.Errors![0].Extensions?.ValidationErrors);
        Assert.True(payload.Errors![0].Extensions!.ValidationErrors!.ContainsKey("Request.CaptchaToken"));
    }

    [Fact]
    public async Task GraphQlCreateComment_WithInvalidAttachmentContentType_ReturnsValidationErrorsExtension()
    {
        using var client = _factory.CreateClient();

        var body = new
        {
            query = @"mutation {
  addComment(input: {
    userName: \"User123\",
    email: \"user@example.com\",
    homePage: \"https://example.com\",
    text: \"Hello\",
    captchaToken: \"1234\",
    attachment: {
      fileName: \"note.pdf\",
      contentType: \"application/pdf\",
      base64Content: \"SGVsbG8=\"
    }
  }) {
    id
  }
}"
        };

        var response = await client.PostAsJsonAsync("/graphql", body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<GraphQlResponse>();
        Assert.NotNull(payload);
        Assert.NotNull(payload!.Errors);
        Assert.NotEmpty(payload.Errors!);
        Assert.Equal("BAD_USER_INPUT", payload.Errors![0].Extensions?.Code);
        Assert.NotNull(payload.Errors![0].Extensions?.ValidationErrors);
        Assert.True(payload.Errors![0].Extensions!.ValidationErrors!.ContainsKey("Request.Attachment.ContentType"));
    }

    [Fact]
    public async Task GraphQlCreateComment_WithValidPayload_ReturnsDataWithoutErrors()
    {
        using var client = _factory.CreateClient();

        var body = new
        {
            query = @"mutation {
  addComment(input: {
    userName: \"User123\",
    email: \"user@example.com\",
    homePage: \"https://example.com\",
    text: \"Hello from GraphQL\",
    captchaToken: \"1234\"
  }) {
    id
    userName
    text
  }
}"
        };

        var response = await client.PostAsJsonAsync("/graphql", body);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<GraphQlResponse>();
        Assert.NotNull(payload);
        Assert.Null(payload!.Errors);
        Assert.True(payload.Data.HasValue);

        var addComment = payload.Data!.Value.GetProperty("addComment");
        Assert.Equal("User123", addComment.GetProperty("userName").GetString());
        Assert.Equal("Hello from GraphQL", addComment.GetProperty("text").GetString());
        Assert.NotEqual(Guid.Empty, addComment.GetProperty("id").GetGuid());
    }

    [Fact]
    public async Task GraphQlPreviewComment_WithValidInput_ReturnsSanitizedHtmlWithoutErrors()
    {
        using var client = _factory.CreateClient();

        var body = new
        {
            query = "query { previewComment(text: \"Hello <strong>GraphQL</strong>\") }"
        };

        var response = await client.PostAsJsonAsync("/graphql", body);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<GraphQlResponse>();
        Assert.NotNull(payload);
        Assert.Null(payload!.Errors);
        Assert.True(payload.Data.HasValue);

        var preview = payload.Data!.Value.GetProperty("previewComment").GetString();
        Assert.Equal("Hello <strong>GraphQL</strong>", preview);
    }

    [Fact]
    public async Task GraphQlSearchComments_WithValidInput_ReturnsPagedShapeWithoutErrors()
    {
        using var client = _factory.CreateClient();

        var body = new
        {
            query = "query { searchComments(query: \"hello\", page: 1, pageSize: 10) { page pageSize totalCount items { id } } }"
        };

        var response = await client.PostAsJsonAsync("/graphql", body);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<GraphQlResponse>();
        Assert.NotNull(payload);
        Assert.Null(payload!.Errors);
        Assert.True(payload.Data.HasValue);

        var searchComments = payload.Data!.Value.GetProperty("searchComments");
        Assert.Equal(1, searchComments.GetProperty("page").GetInt32());
        Assert.Equal(10, searchComments.GetProperty("pageSize").GetInt32());
        Assert.True(searchComments.GetProperty("totalCount").GetInt32() >= 0);
        Assert.Equal(JsonValueKind.Array, searchComments.GetProperty("items").ValueKind);
    }

    private sealed class ValidationProblemPayload
    {
        public int Status { get; set; }
        public Dictionary<string, string[]> Errors { get; set; } = new();
    }

    private sealed class GraphQlResponse
    {
        public List<GraphQlError>? Errors { get; set; }
        public JsonElement? Data { get; set; }
    }

    private sealed class GraphQlError
    {
        public GraphQlExtensions? Extensions { get; set; }
    }

    private sealed class GraphQlExtensions
    {
        public string? Code { get; set; }
        public Dictionary<string, string[]>? ValidationErrors { get; set; }
    }
}
