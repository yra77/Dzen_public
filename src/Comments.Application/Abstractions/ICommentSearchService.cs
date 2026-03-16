using Comments.Application.DTOs;

namespace Comments.Application.Abstractions;

public interface ICommentSearchService
{
    Task<PagedResult<CommentDto>> SearchAsync(string query, int page, int pageSize, CancellationToken cancellationToken);
}
