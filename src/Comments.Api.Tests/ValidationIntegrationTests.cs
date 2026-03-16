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
    }
}
