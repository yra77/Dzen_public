using Comments.Application.Abstractions;
using Comments.Domain.Entities;

namespace Comments.Api.Infrastructure;

public sealed class InMemoryCommentRepository : ICommentRepository
{
    private readonly List<Comment> _items = new();

    public Task<Comment?> FindByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return Task.FromResult(_items.FirstOrDefault(c => c.Id == id));
    }

    public Task<IReadOnlyCollection<Comment>> GetRootCommentsAsync(int page, int pageSize, CancellationToken cancellationToken)
    {
        var pageItems = _items
            .Where(x => x.ParentId is null)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToArray();

        return Task.FromResult<IReadOnlyCollection<Comment>>(pageItems);
    }

    public Task AddAsync(Comment comment, CancellationToken cancellationToken)
    {
        _items.Add(comment);
        return Task.CompletedTask;
    }
}
