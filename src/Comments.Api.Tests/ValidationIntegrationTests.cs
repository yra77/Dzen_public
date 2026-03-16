using System.Net;
using System.Net.Http.Json;
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

    private sealed class ValidationProblemPayload
    {
        public int Status { get; set; }
        public Dictionary<string, string[]> Errors { get; set; } = new();
    }

    private sealed class GraphQlResponse
    {
        public List<GraphQlError>? Errors { get; set; }
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
