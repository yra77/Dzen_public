using Comments.Application.DTOs;

namespace Comments.Api.Infrastructure;

public interface ICommentSearchService
{
    Task<PagedResult<CommentDto>> SearchAsync(string query, int page, int pageSize, CancellationToken cancellationToken);
}
