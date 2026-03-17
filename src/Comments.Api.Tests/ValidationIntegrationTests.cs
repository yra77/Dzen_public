using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Comments.Application.DTOs;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Comments.Api.Tests;

/// <summary>
/// End-to-end validation and contract tests for REST and GraphQL comment endpoints.
/// </summary>
public sealed class ValidationIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public ValidationIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    /// <summary>
    /// Verifies thread sorting is applied recursively for each nesting level in REST response.
    /// </summary>
    [Fact]
    public async Task GetThread_WithNestedReplies_SortsRecursivelyByUserNameAsc()
    {
        using var client = _factory.CreateClient();

        var unique = Guid.NewGuid().ToString("N");
        var root = await CreateCommentAsync(client, $"Root{unique}", $"root-{unique}@example.com", "Root");

        await CreateCommentAsync(client, $"Zulu{unique}", $"zulu-{unique}@example.com", "Reply Z", root.Id);
        var replyAlpha = await CreateCommentAsync(client, $"Alpha{unique}", $"alpha-{unique}@example.com", "Reply A", root.Id);

        await CreateCommentAsync(client, $"ChildZulu{unique}", $"child-z-{unique}@example.com", "Child Z", replyAlpha.Id);
        await CreateCommentAsync(client, $"ChildAlpha{unique}", $"child-a-{unique}@example.com", "Child A", replyAlpha.Id);

        var threadResponse = await client.GetAsync($"/api/comments/{root.Id}/thread?sortBy=UserName&sortDirection=Asc");

        Assert.Equal(HttpStatusCode.OK, threadResponse.StatusCode);

        var thread = await threadResponse.Content.ReadFromJsonAsync<CommentDto>();
        Assert.NotNull(thread);
        Assert.Equal(new[] { $"Alpha{unique}", $"Zulu{unique}" }, thread!.Replies.Select(x => x.UserName).ToArray());
        Assert.Equal(new[] { $"ChildAlpha{unique}", $"ChildZulu{unique}" }, thread.Replies[0].Replies.Select(x => x.UserName).ToArray());
    }

    /// <summary>
    /// Verifies GraphQL commentTree applies sorting recursively for nested reply levels.
    /// </summary>
    [Fact]
    public async Task GraphQlCommentTree_WithNestedReplies_SortsRecursivelyByUserNameAsc()
    {
        using var client = _factory.CreateClient();

        var unique = Guid.NewGuid().ToString("N");
        var root = await CreateCommentAsync(client, $"Root{unique}", $"root-{unique}@example.com", "Root");

        await CreateCommentAsync(client, $"Zulu{unique}", $"zulu-{unique}@example.com", "Reply Z", root.Id);
        var replyAlpha = await CreateCommentAsync(client, $"Alpha{unique}", $"alpha-{unique}@example.com", "Reply A", root.Id);

        await CreateCommentAsync(client, $"ChildZulu{unique}", $"child-z-{unique}@example.com", "Child Z", replyAlpha.Id);
        await CreateCommentAsync(client, $"ChildAlpha{unique}", $"child-a-{unique}@example.com", "Child A", replyAlpha.Id);

        var body = new
        {
            query = @"query($rootCommentId: UUID!) {
  commentTree(rootCommentId: $rootCommentId, sortBy: UserName, sortDirection: Asc) {
    replies {
      userName
      replies {
        userName
      }
    }
  }
}",
            variables = new { rootCommentId = root.Id }
        };

        var response = await client.PostAsJsonAsync("/graphql", body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<GraphQlResponse>();
        Assert.NotNull(payload);
        Assert.Null(payload!.Errors);
        Assert.True(payload.Data.HasValue);

        var replies = payload.Data!.Value
            .GetProperty("commentTree")
            .GetProperty("replies")
            .EnumerateArray()
            .ToArray();

        Assert.Equal($"Alpha{unique}", replies[0].GetProperty("userName").GetString());
        Assert.Equal($"Zulu{unique}", replies[1].GetProperty("userName").GetString());

        var nestedReplies = replies[0]
            .GetProperty("replies")
            .EnumerateArray()
            .Select(x => x.GetProperty("userName").GetString())
            .ToArray();

        Assert.Equal(new[] { $"ChildAlpha{unique}", $"ChildZulu{unique}" }, nestedReplies);
    }

    /// <summary>
    /// Verifies REST validation rejects a filter value longer than supported limit.
    /// </summary>
    [Fact]
    public async Task GetComments_WithFilterLongerThan200_ReturnsBadRequestValidationProblem()
    {
        using var client = _factory.CreateClient();

        var tooLongFilter = new string('x', 201);
        var response = await client.GetAsync($"/api/comments?page=1&pageSize=25&sortBy=CreatedAtUtc&sortDirection=Desc&filter={tooLongFilter}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ValidationProblemPayload>();
        Assert.NotNull(payload);
        Assert.Equal(400, payload!.Status);
        Assert.True(payload.Errors.ContainsKey("Filter"));
    }

    /// <summary>
    /// Verifies GraphQL validation exposes BAD_USER_INPUT and validationErrors for too-long filter.
    /// </summary>
    [Fact]
    public async Task GraphQlComments_WithFilterLongerThan200_ReturnsBadUserInputError()
    {
        using var client = _factory.CreateClient();

        var tooLongFilter = new string('x', 201);
        var body = new
        {
            query = @"query($page: Int!, $pageSize: Int!, $sortBy: CommentSortField!, $sortDirection: CommentSortDirection!, $filter: String) {
  comments(page: $page, pageSize: $pageSize, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter) {
    totalCount
  }
}",
            variables = new
            {
                page = 1,
                pageSize = 10,
                sortBy = "CreatedAtUtc",
                sortDirection = "Desc",
                filter = tooLongFilter
            }
        };

        var response = await client.PostAsJsonAsync("/graphql", body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<GraphQlResponse>();
        Assert.NotNull(payload);
        Assert.NotNull(payload!.Errors);
        Assert.NotEmpty(payload.Errors!);
        Assert.Equal("BAD_USER_INPUT", payload.Errors![0].Extensions?.Code);
        Assert.NotNull(payload.Errors![0].Extensions?.ValidationErrors);
        Assert.True(payload.Errors![0].Extensions!.ValidationErrors!.ContainsKey("Filter"));
    }

    /// <summary>
    /// Verifies mixed sort/filter/pagination returns an empty second page when only one item matches.
    /// </summary>
    [Fact]
    public async Task GetComments_WithSortPaginationAndFilter_EmptyPageReturnsNoItems()
    {
        using var client = _factory.CreateClient();

        var unique = Guid.NewGuid().ToString("N");

        await CreateCommentAsync(client, $"Alpha{unique}", $"alpha-{unique}@example.com", "Root Alpha");
        await CreateCommentAsync(client, $"Bravo{unique}", $"bravo-{unique}@example.com", "Root Bravo");
        await CreateCommentAsync(client, $"Delta{unique}", $"delta-{unique}@example.com", "Root Delta");

        var response = await client.GetAsync($"/api/comments?page=2&pageSize=1&sortBy=UserName&sortDirection=Asc&filter=brav{unique}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<PagedResult<CommentDto>>();
        Assert.NotNull(payload);
        Assert.Equal(2, payload!.Page);
        Assert.Equal(1, payload.PageSize);
        Assert.Equal(1, payload.TotalCount);
        Assert.Empty(payload.Items);
    }

    /// <summary>
    /// Verifies GraphQL mixed sort/filter/pagination returns an empty second page when only one item matches.
    /// </summary>
    [Fact]
    public async Task GraphQlComments_WithSortPaginationAndFilter_EmptyPageReturnsNoItems()
    {
        using var client = _factory.CreateClient();

        var unique = Guid.NewGuid().ToString("N");

        await CreateCommentAsync(client, $"Alpha{unique}", $"alpha-{unique}@example.com", "Root Alpha");
        await CreateCommentAsync(client, $"Bravo{unique}", $"bravo-{unique}@example.com", "Root Bravo");
        await CreateCommentAsync(client, $"Delta{unique}", $"delta-{unique}@example.com", "Root Delta");

        var body = new
        {
            query = @"query($page: Int!, $pageSize: Int!, $sortBy: CommentSortField!, $sortDirection: CommentSortDirection!, $filter: String) {
  comments(page: $page, pageSize: $pageSize, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter) {
    page
    pageSize
    totalCount
    items {
      userName
    }
  }
}",
            variables = new
            {
                page = 2,
                pageSize = 1,
                sortBy = "UserName",
                sortDirection = "Asc",
                filter = $"brav{unique}"
            }
        };

        var response = await client.PostAsJsonAsync("/graphql", body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<GraphQlResponse>();
        Assert.NotNull(payload);
        Assert.Null(payload!.Errors);
        Assert.True(payload.Data.HasValue);

        var comments = payload.Data!.Value.GetProperty("comments");
        Assert.Equal(2, comments.GetProperty("page").GetInt32());
        Assert.Equal(1, comments.GetProperty("pageSize").GetInt32());
        Assert.Equal(1, comments.GetProperty("totalCount").GetInt32());
        Assert.Empty(comments.GetProperty("items").EnumerateArray());
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
    public async Task Preview_WithBoundaryLength5000_ReturnsSanitizedHtml()
    {
        using var client = _factory.CreateClient();

        var text = new string('a', 5000);
        var response = await client.PostAsJsonAsync("/api/comments/preview", new
        {
            text
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<string>();
        Assert.Equal(text, payload);
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

    /// <summary>
    /// Verifies REST middleware aggregates multiple field-level validation failures in one response.
    /// </summary>
    [Fact]
    public async Task CreateComment_WithMultipleInvalidFields_ReturnsAggregatedValidationProblem()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/comments", new
        {
            userName = "invalid user",
            email = "not-an-email",
            homePage = "ftp://example.com",
            text = string.Empty,
            parentId = (Guid?)null,
            captchaToken = "wrong-token",
            attachment = (object?)null
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ValidationProblemPayload>();
        Assert.NotNull(payload);
        Assert.Equal(400, payload!.Status);
        Assert.True(payload.Errors.ContainsKey("Request.UserName"));
        Assert.True(payload.Errors.ContainsKey("Request.Email"));
        Assert.True(payload.Errors.ContainsKey("Request.HomePage"));
        Assert.True(payload.Errors.ContainsKey("Request.Text"));
        Assert.True(payload.Errors.ContainsKey("Request.CaptchaToken"));
        Assert.True(payload.Errors.Count >= 5);
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

    /// <summary>
    /// Verifies REST validation returns field-level attachment content-type errors for unsupported MIME.
    /// </summary>
    [Fact]
    public async Task CreateComment_WithInvalidAttachmentContentType_ReturnsBadRequestValidationProblem()
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
                fileName = "note.pdf",
                contentType = "application/pdf",
                base64Content = Convert.ToBase64String("Hello"u8.ToArray())
            }
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ValidationProblemPayload>();
        Assert.NotNull(payload);
        Assert.Equal(400, payload!.Status);
        Assert.True(payload.Errors.ContainsKey("Request.Attachment.ContentType"));
    }


    /// <summary>
    /// Verifies REST validation rejects attachment payloads larger than 1MB.
    /// </summary>
    [Fact]
    public async Task CreateComment_WithAttachmentLargerThan1Mb_ReturnsBadRequestValidationProblem()
    {
        using var client = _factory.CreateClient();

        var overLimitBase64 = Convert.ToBase64String(new byte[1_000_001]);
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
                fileName = "big.txt",
                contentType = "text/plain",
                base64Content = overLimitBase64
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
    public async Task Search_WithBoundaryPageSize100_ReturnsPagedShape()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/comments/search?q=hello&page=1&pageSize=100");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<PagedResult<CommentDto>>();
        Assert.NotNull(payload);
        Assert.Equal(1, payload!.Page);
        Assert.Equal(100, payload.PageSize);
        Assert.True(payload.TotalCount >= 0);
    }

    [Fact]
    public async Task Search_WithPageSizeAboveLimit_ReturnsBadRequestValidationProblem()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/comments/search?q=hello&page=1&pageSize=101");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ValidationProblemPayload>();
        Assert.NotNull(payload);
        Assert.Equal(400, payload!.Status);
        Assert.True(payload.Errors.ContainsKey("PageSize"));
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

    /// <summary>
    /// Verifies GraphQL error filter aggregates multiple validation failures into validationErrors extension.
    /// </summary>
    [Fact]
    public async Task GraphQlCreateComment_WithMultipleInvalidFields_ReturnsAggregatedValidationErrorsExtension()
    {
        using var client = _factory.CreateClient();

        var body = new
        {
            query = @"mutation {
  addComment(input: {
    userName: \"invalid user\",
    email: \"not-an-email\",
    homePage: \"ftp://example.com\",
    text: \"\",
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

        var validationErrors = payload.Errors![0].Extensions!.ValidationErrors!;
        Assert.True(validationErrors.ContainsKey("Request.UserName"));
        Assert.True(validationErrors.ContainsKey("Request.Email"));
        Assert.True(validationErrors.ContainsKey("Request.HomePage"));
        Assert.True(validationErrors.ContainsKey("Request.Text"));
        Assert.True(validationErrors.ContainsKey("Request.CaptchaToken"));
        Assert.True(validationErrors.Count >= 5);
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

    /// <summary>
    /// Verifies GraphQL mutation maps malformed attachment base64 into BAD_USER_INPUT validation metadata.
    /// </summary>
    [Fact]
    public async Task GraphQlCreateComment_WithInvalidAttachmentBase64_ReturnsValidationErrorsExtension()
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
      fileName: \"note.txt\",
      contentType: \"text/plain\",
      base64Content: \"invalid-base64\"
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
        Assert.True(payload.Errors![0].Extensions!.ValidationErrors!.ContainsKey("Request.Attachment"));
    }


    /// <summary>
    /// Verifies GraphQL validation rejects attachment payloads larger than 1MB.
    /// </summary>
    [Fact]
    public async Task GraphQlCreateComment_WithAttachmentLargerThan1Mb_ReturnsValidationErrorsExtension()
    {
        using var client = _factory.CreateClient();

        var overLimitBase64 = Convert.ToBase64String(new byte[1_000_001]);
        var body = new
        {
            query = @"mutation($base64Content: String!) {
  addComment(input: {
    userName: ""User123"",
    email: ""user@example.com"",
    homePage: ""https://example.com"",
    text: ""Hello"",
    captchaToken: ""1234"",
    attachment: {
      fileName: ""big.txt"",
      contentType: ""text/plain"",
      base64Content: $base64Content
    }
  }) {
    id
  }
}",
            variables = new { base64Content = overLimitBase64 }
        };

        var response = await client.PostAsJsonAsync("/graphql", body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<GraphQlResponse>();
        Assert.NotNull(payload);
        Assert.NotNull(payload!.Errors);
        Assert.NotEmpty(payload.Errors!);
        Assert.Equal("BAD_USER_INPUT", payload.Errors![0].Extensions?.Code);
        Assert.NotNull(payload.Errors![0].Extensions?.ValidationErrors);
        Assert.True(payload.Errors![0].Extensions!.ValidationErrors!.ContainsKey("Request.Attachment"));
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
    public async Task GraphQlPreviewComment_WithBoundaryLength5000_ReturnsDataWithoutErrors()
    {
        using var client = _factory.CreateClient();

        var text = new string('b', 5000);
        var body = new
        {
            query = "query($text: String!) { previewComment(text: $text) }",
            variables = new { text }
        };

        var response = await client.PostAsJsonAsync("/graphql", body);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<GraphQlResponse>();
        Assert.NotNull(payload);
        Assert.Null(payload!.Errors);
        Assert.True(payload.Data.HasValue);

        var preview = payload.Data!.Value.GetProperty("previewComment").GetString();
        Assert.Equal(text, preview);
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

    [Fact]
    public async Task GraphQlSearchComments_WithBoundaryPageSize100_ReturnsPagedShapeWithoutErrors()
    {
        using var client = _factory.CreateClient();

        var body = new
        {
            query = "query { searchComments(query: \"hello\", page: 1, pageSize: 100) { page pageSize totalCount items { id } } }"
        };

        var response = await client.PostAsJsonAsync("/graphql", body);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<GraphQlResponse>();
        Assert.NotNull(payload);
        Assert.Null(payload!.Errors);
        Assert.True(payload.Data.HasValue);

        var searchComments = payload.Data!.Value.GetProperty("searchComments");
        Assert.Equal(1, searchComments.GetProperty("page").GetInt32());
        Assert.Equal(100, searchComments.GetProperty("pageSize").GetInt32());
        Assert.True(searchComments.GetProperty("totalCount").GetInt32() >= 0);
    }

    [Fact]
    public async Task GraphQlSearchComments_WithPageSizeAboveLimit_ReturnsValidationErrorsExtension()
    {
        using var client = _factory.CreateClient();

        var body = new
        {
            query = "query { searchComments(query: \"hello\", page: 1, pageSize: 101) { totalCount items { id } } }"
        };

        var response = await client.PostAsJsonAsync("/graphql", body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<GraphQlResponse>();
        Assert.NotNull(payload);
        Assert.NotNull(payload!.Errors);
        Assert.NotEmpty(payload.Errors!);
        Assert.Equal("BAD_USER_INPUT", payload.Errors![0].Extensions?.Code);
        Assert.NotNull(payload.Errors![0].Extensions?.ValidationErrors);
        Assert.True(payload.Errors![0].Extensions!.ValidationErrors!.ContainsKey("PageSize"));
    }

    [Fact]
    public async Task GetThread_WithSortByUserNameAsc_ReturnsRepliesSortedAscending()
    {
        using var client = _factory.CreateClient();

        var unique = Guid.NewGuid().ToString("N");
        var root = await CreateCommentAsync(client, $"Root{unique}", $"root-{unique}@example.com", "Root");

        await CreateCommentAsync(client, $"Zulu{unique}", $"zulu-{unique}@example.com", "Reply Z", root.Id);
        await CreateCommentAsync(client, $"Alpha{unique}", $"alpha-{unique}@example.com", "Reply A", root.Id);

        var threadResponse = await client.GetAsync($"/api/comments/{root.Id}/thread?sortBy=UserName&sortDirection=Asc");

        Assert.Equal(HttpStatusCode.OK, threadResponse.StatusCode);

        var thread = await threadResponse.Content.ReadFromJsonAsync<CommentDto>();
        Assert.NotNull(thread);
        Assert.Equal(2, thread!.Replies.Count);
        Assert.Equal($"Alpha{unique}", thread.Replies[0].UserName);
        Assert.Equal($"Zulu{unique}", thread.Replies[1].UserName);
    }

    [Fact]
    public async Task GraphQlCommentTree_WithSortByEmailDesc_ReturnsRepliesSortedDescending()
    {
        using var client = _factory.CreateClient();

        var unique = Guid.NewGuid().ToString("N");
        var root = await CreateCommentAsync(client, $"Root{unique}", $"root-{unique}@example.com", "Root");

        await CreateCommentAsync(client, $"UserA{unique}", $"alpha-{unique}@example.com", "Reply A", root.Id);
        await CreateCommentAsync(client, $"UserB{unique}", $"zulu-{unique}@example.com", "Reply B", root.Id);

        var body = new
        {
            query = @"query($rootCommentId: UUID!) {
  commentTree(rootCommentId: $rootCommentId, sortBy: Email, sortDirection: Desc) {
    replies {
      email
    }
  }
}",
            variables = new { rootCommentId = root.Id }
        };

        var response = await client.PostAsJsonAsync("/graphql", body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<GraphQlResponse>();
        Assert.NotNull(payload);
        Assert.Null(payload!.Errors);
        Assert.True(payload.Data.HasValue);

        var replies = payload.Data!.Value
            .GetProperty("commentTree")
            .GetProperty("replies")
            .EnumerateArray()
            .Select(x => x.GetProperty("email").GetString())
            .ToArray();

        Assert.Equal(new[] { $"zulu-{unique}@example.com", $"alpha-{unique}@example.com" }, replies);
    }


    /// <summary>
    /// Verifies REST mixed sort/filter boundary trims filter and matches by email field.
    /// </summary>
    [Fact]
    public async Task GetComments_WithTrimmedFilterAndEmailSort_ReturnsEmailMatchedItemsInOrder()
    {
        using var client = _factory.CreateClient();

        var unique = Guid.NewGuid().ToString("N");

        await CreateCommentAsync(client, $"UserOne{unique}", $"one-{unique}@example.com", "Contains marker");
        await CreateCommentAsync(client, $"UserTwo{unique}", $"two-{unique}@example.com", "Contains marker");
        await CreateCommentAsync(client, $"UserThree{unique}", $"zzz-{unique}@example.com", "No marker");

        var response = await client.GetAsync($"/api/comments?page=1&pageSize=100&sortBy=Email&sortDirection=Desc&filter=%20marker%20");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<PagedResult<CommentDto>>();
        Assert.NotNull(payload);
        Assert.Equal(2, payload!.TotalCount);

        var uniqueEmails = payload.Items
            .Select(x => x.Email)
            .Where(x => x.Contains(unique, StringComparison.Ordinal))
            .ToArray();

        Assert.Equal(new[] { $"two-{unique}@example.com", $"one-{unique}@example.com" }, uniqueEmails);
    }

    /// <summary>
    /// Verifies GraphQL mixed sort/filter boundary matches by text and preserves pagination contract.
    /// </summary>
    [Fact]
    public async Task GraphQlComments_WithTextFilterAndSecondPage_ReturnsSingleExpectedItem()
    {
        using var client = _factory.CreateClient();

        var unique = Guid.NewGuid().ToString("N");

        await CreateCommentAsync(client, $"Echo{unique}", $"echo-{unique}@example.com", $"News {unique}");
        await CreateCommentAsync(client, $"Delta{unique}", $"delta-{unique}@example.com", $"News {unique}");
        await CreateCommentAsync(client, $"Alpha{unique}", $"alpha-{unique}@example.com", $"News {unique}");

        var body = new
        {
            query = @"query($page: Int!, $pageSize: Int!, $sortBy: CommentSortField!, $sortDirection: CommentSortDirection!, $filter: String) {
  comments(page: $page, pageSize: $pageSize, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter) {
    page
    pageSize
    totalCount
    items {
      userName
    }
  }
}",
            variables = new
            {
                page = 2,
                pageSize = 2,
                sortBy = "UserName",
                sortDirection = "Asc",
                filter = unique
            }
        };

        var response = await client.PostAsJsonAsync("/graphql", body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<GraphQlResponse>();
        Assert.NotNull(payload);
        Assert.Null(payload!.Errors);
        Assert.True(payload.Data.HasValue);

        var comments = payload.Data!.Value.GetProperty("comments");
        Assert.Equal(2, comments.GetProperty("page").GetInt32());
        Assert.Equal(2, comments.GetProperty("pageSize").GetInt32());
        Assert.Equal(3, comments.GetProperty("totalCount").GetInt32());

        var uniqueNames = comments
            .GetProperty("items")
            .EnumerateArray()
            .Select(x => x.GetProperty("userName").GetString())
            .Where(x => x is not null && x.Contains(unique, StringComparison.Ordinal))
            .Cast<string>()
            .ToArray();

        Assert.Single(uniqueNames);
        Assert.Equal($"Echo{unique}", uniqueNames[0]);
    }

    [Fact]
    public async Task GetComments_WithSortPaginationAndFilter_ReturnsFilteredPageSlice()
    {
        using var client = _factory.CreateClient();

        var unique = Guid.NewGuid().ToString("N");

        await CreateCommentAsync(client, $"Alpha{unique}", $"alpha-{unique}@example.com", "Root Alpha");
        await CreateCommentAsync(client, $"Atlas{unique}", $"atlas-{unique}@example.com", "Root Atlas");
        await CreateCommentAsync(client, $"Delta{unique}", $"delta-{unique}@example.com", "Root Delta");

        var response = await client.GetAsync($"/api/comments?page=1&pageSize=1&sortBy=UserName&sortDirection=Asc&filter=at{unique}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<PagedResult<CommentDto>>();
        Assert.NotNull(payload);
        Assert.Equal(1, payload!.Page);
        Assert.Equal(1, payload.PageSize);
        Assert.Equal(1, payload.TotalCount);
        Assert.Single(payload.Items);
        Assert.Equal($"Atlas{unique}", payload.Items[0].UserName);
    }

    [Fact]
    public async Task GraphQlComments_WithSortPaginationAndFilter_ReturnsFilteredOrderingWithoutErrors()
    {
        using var client = _factory.CreateClient();

        var unique = Guid.NewGuid().ToString("N");

        await CreateCommentAsync(client, $"Alpha{unique}", $"alpha-{unique}@example.com", "Root Alpha");
        await CreateCommentAsync(client, $"Alpine{unique}", $"alpine-{unique}@example.com", "Root Alpine");
        await CreateCommentAsync(client, $"Bravo{unique}", $"bravo-{unique}@example.com", "Root Bravo");

        var body = new
        {
            query = @"query($page: Int!, $pageSize: Int!, $sortBy: CommentSortField!, $sortDirection: CommentSortDirection!, $filter: String) {
  comments(page: $page, pageSize: $pageSize, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter) {
    page
    pageSize
    totalCount
    items {
      userName
    }
  }
}",
            variables = new
            {
                page = 1,
                pageSize = 100,
                sortBy = "UserName",
                sortDirection = "Desc",
                filter = $"alp{unique}"
            }
        };

        var response = await client.PostAsJsonAsync("/graphql", body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<GraphQlResponse>();
        Assert.NotNull(payload);
        Assert.Null(payload!.Errors);
        Assert.True(payload.Data.HasValue);

        var comments = payload.Data!.Value.GetProperty("comments");
        Assert.Equal(2, comments.GetProperty("totalCount").GetInt32());

        var uniqueNames = comments
            .GetProperty("items")
            .EnumerateArray()
            .Select(x => x.GetProperty("userName").GetString())
            .Where(x => x is not null && x.Contains(unique, StringComparison.Ordinal))
            .Cast<string>()
            .ToArray();

        Assert.Equal(new[] { $"Alpine{unique}", $"Alpha{unique}" }, uniqueNames);
    }

    [Fact]
    public async Task GetComments_WithSortAndPagination_ReturnsExpectedPageSlice()
    {
        using var client = _factory.CreateClient();

        var unique = Guid.NewGuid().ToString("N");

        await CreateCommentAsync(client, $"Echo{unique}", $"echo-{unique}@example.com", "Root Echo");
        await CreateCommentAsync(client, $"Alpha{unique}", $"alpha-{unique}@example.com", "Root Alpha");
        await CreateCommentAsync(client, $"Delta{unique}", $"delta-{unique}@example.com", "Root Delta");
        await CreateCommentAsync(client, $"Charlie{unique}", $"charlie-{unique}@example.com", "Root Charlie");
        await CreateCommentAsync(client, $"Bravo{unique}", $"bravo-{unique}@example.com", "Root Bravo");

        var response = await client.GetAsync("/api/comments?page=2&pageSize=2&sortBy=UserName&sortDirection=Asc");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<PagedResult<CommentDto>>();
        Assert.NotNull(payload);
        Assert.Equal(2, payload!.Page);
        Assert.Equal(2, payload.PageSize);
        Assert.True(payload.TotalCount >= 5);
        Assert.Equal(2, payload.Items.Count);
        Assert.Equal($"Charlie{unique}", payload.Items[0].UserName);
        Assert.Equal($"Delta{unique}", payload.Items[1].UserName);
    }

    [Fact]
    public async Task GraphQlComments_WithSortAndBoundaryPageSize_ReturnsExpectedOrderingWithoutErrors()
    {
        using var client = _factory.CreateClient();

        var unique = Guid.NewGuid().ToString("N");

        await CreateCommentAsync(client, $"UserA{unique}", $"a-{unique}@example.com", "Root A");
        await CreateCommentAsync(client, $"UserB{unique}", $"b-{unique}@example.com", "Root B");
        await CreateCommentAsync(client, $"UserC{unique}", $"c-{unique}@example.com", "Root C");

        var body = new
        {
            query = @"query($page: Int!, $pageSize: Int!, $sortBy: CommentSortField!, $sortDirection: CommentSortDirection!) {
  comments(page: $page, pageSize: $pageSize, sortBy: $sortBy, sortDirection: $sortDirection) {
    page
    pageSize
    totalCount
    items {
      email
    }
  }
}",
            variables = new
            {
                page = 1,
                pageSize = 100,
                sortBy = "Email",
                sortDirection = "Desc"
            }
        };

        var response = await client.PostAsJsonAsync("/graphql", body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<GraphQlResponse>();
        Assert.NotNull(payload);
        Assert.Null(payload!.Errors);
        Assert.True(payload.Data.HasValue);

        var comments = payload.Data!.Value.GetProperty("comments");
        Assert.Equal(1, comments.GetProperty("page").GetInt32());
        Assert.Equal(100, comments.GetProperty("pageSize").GetInt32());

        var uniqueEmails = comments
            .GetProperty("items")
            .EnumerateArray()
            .Select(x => x.GetProperty("email").GetString())
            .Where(x => x is not null && x.Contains(unique, StringComparison.Ordinal))
            .Cast<string>()
            .ToArray();

        Assert.Equal(new[] { $"c-{unique}@example.com", $"b-{unique}@example.com", $"a-{unique}@example.com" }, uniqueEmails);
    }

    /// <summary>
    /// Verifies REST create accepts a boundary attachment of exactly 1MB.
    /// </summary>
    [Fact]
    public async Task CreateComment_WithAttachmentExactly1Mb_ReturnsCreated()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/comments", new
        {
            userName = "RestAttachmentBoundary",
            email = "rest-attachment-boundary@example.com",
            homePage = "https://example.com",
            text = "Boundary payload",
            parentId = (Guid?)null,
            captchaToken = "1234",
            attachment = BuildTextAttachmentPayload("boundary-rest.txt", 1_000_000)
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<CommentDto>();
        Assert.NotNull(payload);
        Assert.NotNull(payload!.Attachment);
        Assert.Equal("boundary-rest.txt", payload.Attachment!.FileName);
        Assert.Equal(1_000_000, payload.Attachment.SizeBytes);
    }

    /// <summary>
    /// Verifies GraphQL mutation accepts a boundary attachment of exactly 1MB.
    /// </summary>
    [Fact]
    public async Task GraphQlCreateComment_WithAttachmentExactly1Mb_ReturnsCreatedComment()
    {
        using var client = _factory.CreateClient();

        var body = new
        {
            query = @"mutation($input: CreateCommentInput!) {
  createComment(input: $input) {
    id
    attachment {
      fileName
      sizeBytes
    }
  }
}",
            variables = new
            {
                input = new
                {
                    userName = "GraphQlAttachmentBoundary",
                    email = "graphql-attachment-boundary@example.com",
                    homePage = "https://example.com",
                    text = "GraphQL boundary payload",
                    parentId = (Guid?)null,
                    captchaToken = "1234",
                    attachment = BuildTextAttachmentPayload("boundary-graphql.txt", 1_000_000)
                }
            }
        };

        var response = await client.PostAsJsonAsync("/graphql", body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<GraphQlResponse>();
        Assert.NotNull(payload);
        Assert.Null(payload!.Errors);
        Assert.True(payload.Data.HasValue);

        var created = payload.Data!.Value.GetProperty("createComment");
        var attachment = created.GetProperty("attachment");
        Assert.Equal("boundary-graphql.txt", attachment.GetProperty("fileName").GetString());
        Assert.Equal(1_000_000, attachment.GetProperty("sizeBytes").GetInt64());
    }

    /// <summary>
    /// Builds a deterministic text/plain attachment payload with the requested byte size.
    /// </summary>
    /// <param name="fileName">Attachment file name.</param>
    /// <param name="sizeBytes">Required payload size in bytes.</param>
    /// <returns>Anonymous object that matches CreateComment attachment contract.</returns>
    private static object BuildTextAttachmentPayload(string fileName, int sizeBytes)
    {
        var bytes = new byte[sizeBytes];
        Array.Fill(bytes, (byte)'a');

        return new
        {
            fileName,
            contentType = "text/plain",
            base64Content = Convert.ToBase64String(bytes)
        };
    }

    private static async Task<CommentDto> CreateCommentAsync(
        HttpClient client,
        string userName,
        string email,
        string text,
        Guid? parentId = null)
    {
        var response = await client.PostAsJsonAsync("/api/comments", new
        {
            userName,
            email,
            homePage = "https://example.com",
            text,
            parentId,
            captchaToken = "1234",
            attachment = (object?)null
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<CommentDto>();
        Assert.NotNull(payload);

        return payload!;
    }

    /// <summary>
    /// Minimal REST validation problem payload contract used in integration assertions.
    /// </summary>
    private sealed class ValidationProblemPayload
    {
        /// <summary>
        /// Gets or sets HTTP status code from the payload.
        /// </summary>
        public int Status { get; set; }

        /// <summary>
        /// Gets or sets field validation errors keyed by property name.
        /// </summary>
        public Dictionary<string, string[]> Errors { get; set; } = new();
    }

    /// <summary>
    /// Minimal GraphQL envelope contract used in integration assertions.
    /// </summary>
    private sealed class GraphQlResponse
    {
        /// <summary>
        /// Gets or sets GraphQL errors array.
        /// </summary>
        public List<GraphQlError>? Errors { get; set; }

        /// <summary>
        /// Gets or sets optional GraphQL data object.
        /// </summary>
        public JsonElement? Data { get; set; }
    }

    /// <summary>
    /// Minimal GraphQL error contract that carries extension metadata.
    /// </summary>
    private sealed class GraphQlError
    {
        /// <summary>
        /// Gets or sets extension payload with error code and validation details.
        /// </summary>
        public GraphQlExtensions? Extensions { get; set; }
    }

    /// <summary>
    /// GraphQL error extensions contract used to verify validation behavior.
    /// </summary>
    private sealed class GraphQlExtensions
    {
        /// <summary>
        /// Gets or sets GraphQL error code.
        /// </summary>
        [JsonPropertyName("code")]
        public string? Code { get; set; }

        /// <summary>
        /// Gets or sets validation errors keyed by field path.
        /// </summary>
        [JsonPropertyName("validationErrors")]
        public Dictionary<string, string[]>? ValidationErrors { get; set; }
    }
}
