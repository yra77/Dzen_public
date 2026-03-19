using Comments.Application.Abstractions;
using Comments.Application.DTOs;
using Comments.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Comments.Api.Infrastructure;

/// <summary>
/// EF Core repository implementation for comments and thread loading.
/// </summary>
public sealed class EfCommentRepository : ICommentRepository
{
    private readonly CommentsDbContext _dbContext;

    /// <summary>
    /// Initializes repository with EF DbContext.
    /// </summary>
    /// <param name="dbContext">DbContext instance for comments persistence.</param>
    public EfCommentRepository(CommentsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <summary>
    /// Returns comment by identifier or <see langword="null"/> when not found.
    /// </summary>
    public async Task<Comment?> FindByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var allComments = await _dbContext.Comments
            .AsNoTracking()
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        if (allComments.Count == 0)
        {
            return null;
        }

        var commentById = allComments.ToDictionary(x => x.Id);
        foreach (var comment in allComments)
        {
            if (comment.ParentId is Guid parentId && commentById.TryGetValue(parentId, out var parentComment))
            {
                parentComment.AddReply(comment);
            }
        }

        return commentById.GetValueOrDefault(id);
    }

    /// <summary>
    /// Returns all comments ordered by creation time.
    /// </summary>
    public async Task<IReadOnlyCollection<Comment>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Comments
            .AsNoTracking()
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Returns paged root comments and rebuilds reply tree for selected roots.
    /// </summary>
    public async Task<(IReadOnlyCollection<Comment> Items, int TotalCount)> GetRootCommentsAsync(
        int page,
        int pageSize,
        CommentSortField sortField,
        CommentSortDirection sortDirection,
        string? filter,
        CancellationToken cancellationToken)
    {
        var rootsQuery = _dbContext.Comments
            .AsNoTracking()
            .Where(x => x.ParentId == null);

        if (!string.IsNullOrWhiteSpace(filter))
        {
            var normalizedFilter = filter.Trim();
            rootsQuery = rootsQuery.Where(x =>
                EF.Functions.Like(x.UserName, $"%{normalizedFilter}%") ||
                EF.Functions.Like(x.Email, $"%{normalizedFilter}%") ||
                EF.Functions.Like(x.Text, $"%{normalizedFilter}%"));
        }

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
        var sortedRootIds = rootPage.Select(x => x.Id).ToArray();
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

        var pageRootsById = allComments
            .Where(x => x.ParentId is null && pageRootIds.Contains(x.Id))
            .ToDictionary(x => x.Id);

        var pageRoots = sortedRootIds
            .Where(pageRootsById.ContainsKey)
            .Select(rootId => pageRootsById[rootId])
            .ToArray();

        return (pageRoots, totalCount);
    }

    /// <summary>
    /// Adds comment and commits transaction to database.
    /// </summary>
    public async Task AddAsync(Comment comment, CancellationToken cancellationToken)
    {
        await _dbContext.Comments.AddAsync(comment, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Applies sorting to root comments query by requested field and direction.
    /// </summary>
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
