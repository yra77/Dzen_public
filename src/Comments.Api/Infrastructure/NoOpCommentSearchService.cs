using Comments.Application.Abstractions;
using Comments.Application.DTOs;

namespace Comments.Api.Infrastructure;

public sealed class NoOpCommentSearchService : ICommentSearchService
{
    public Task<PagedResult<CommentDto>> SearchAsync(string query, int page, int pageSize, CancellationToken cancellationToken)
    {
        return Task.FromResult(new PagedResult<CommentDto>(page, pageSize, 0, Array.Empty<CommentDto>()));
    }
}
