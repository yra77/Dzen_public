namespace Comments.Application.DTOs;

public sealed record PagedResult<T>(
    int Page,
    int PageSize,
    int TotalCount,
    IReadOnlyCollection<T> Items);
