namespace Comments.Api.Infrastructure;

public sealed class ElasticsearchOptions
{
    public bool Enabled { get; init; }
    public string Uri { get; init; } = "http://localhost:9200";
    public string IndexName { get; init; } = "comments";
}
