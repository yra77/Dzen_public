using Comments.Application.Abstractions;
using Comments.Application.DTOs;
using Comments.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Comments.Api.Infrastructure;

public sealed class EfCommentRepository : ICommentRepository
{
    private readonly CommentsDbContext _dbContext;

    public EfCommentRepository(CommentsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Comment?> FindByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _dbContext.Comments.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<(IReadOnlyCollection<Comment> Items, int TotalCount)> GetRootCommentsAsync(
        int page,
        int pageSize,
        CommentSortField sortField,
        CommentSortDirection sortDirection,
        CancellationToken cancellationToken)
    {
        var rootsQuery = _dbContext.Comments.Where(x => x.ParentId == null);
        var totalCount = await rootsQuery.CountAsync(cancellationToken);

        var sortedRoots = ApplySort(rootsQuery, sortField, sortDirection);
        var rootPage = await sortedRoots
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        if (rootPage.Count == 0)
        {
            return (Array.Empty<Comment>(), totalCount);
        }

        var pageRootIds = rootPage.Select(x => x.Id).ToHashSet();
        var allComments = await _dbContext.Comments
            .AsNoTracking()
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var map = allComments.ToDictionary(x => x.Id);
        foreach (var item in allComments)
        {
            if (item.ParentId is Guid parentId && map.TryGetValue(parentId, out var parent))
            {
                parent.AddReply(item);
            }
        }

        var pageRoots = allComments
            .Where(x => x.ParentId is null && pageRootIds.Contains(x.Id))
            .ToArray();

        return (pageRoots, totalCount);
    }

    public async Task AddAsync(Comment comment, CancellationToken cancellationToken)
    {
        await _dbContext.Comments.AddAsync(comment, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static IOrderedQueryable<Comment> ApplySort(
        IQueryable<Comment> query,
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
