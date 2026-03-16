using Comments.Application.Abstractions;
using Comments.Application.DTOs;
using Comments.Domain.Entities;

namespace Comments.Api.Infrastructure;

public sealed class InMemoryCommentRepository : ICommentRepository
{
    private readonly List<Comment> _items = new();

    public Task<Comment?> FindByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return Task.FromResult(_items.FirstOrDefault(c => c.Id == id));
    }

    public Task<IReadOnlyCollection<Comment>> GetAllAsync(CancellationToken cancellationToken)
    {
        return Task.FromResult<IReadOnlyCollection<Comment>>(_items.ToArray());
    }

    public Task<(IReadOnlyCollection<Comment> Items, int TotalCount)> GetRootCommentsAsync(
        int page,
        int pageSize,
        CommentSortField sortField,
        CommentSortDirection sortDirection,
        CancellationToken cancellationToken)
    {
        var query = _items.Where(x => x.ParentId is null);
        var totalCount = query.Count();

        var sorted = ApplySort(query, sortField, sortDirection);

        var pageItems = sorted
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToArray();

        return Task.FromResult<(IReadOnlyCollection<Comment> Items, int TotalCount)>((pageItems, totalCount));
    }

    public Task AddAsync(Comment comment, CancellationToken cancellationToken)
    {
        _items.Add(comment);
        return Task.CompletedTask;
    }

    private static IOrderedEnumerable<Comment> ApplySort(
        IEnumerable<Comment> query,
        CommentSortField sortField,
        CommentSortDirection sortDirection)
    {
        return (sortField, sortDirection) switch
        {
            (CommentSortField.UserName, CommentSortDirection.Asc) => query.OrderBy(x => x.UserName),
            (CommentSortField.UserName, CommentSortDirection.Desc) => query.OrderByDescending(x => x.UserName),
            (CommentSortField.Email, CommentSortDirection.Asc) => query.OrderBy(x => x.Email),
            (CommentSortField.Email, CommentSortDirection.Desc) => query.OrderByDescending(x => x.Email),
            (CommentSortField.CreatedAtUtc, CommentSortDirection.Asc) => query.OrderBy(x => x.CreatedAtUtc),
            _ => query.OrderByDescending(x => x.CreatedAtUtc)
        };
    }
}
