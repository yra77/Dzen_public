using Comments.Domain.Entities;

namespace Comments.Application.Abstractions;

public interface ICommentRepository
{
    Task<Comment?> FindByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Comment>> GetRootCommentsAsync(int page, int pageSize, CancellationToken cancellationToken);
    Task AddAsync(Comment comment, CancellationToken cancellationToken);
}
