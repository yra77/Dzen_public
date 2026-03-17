using Comments.Application.DTOs;
using MediatR;

namespace Comments.Application.Features.Comments.Queries.GetCommentThread;

/// <summary>
/// Query contract for loading a full comment thread from a root comment.
/// </summary>
public sealed record GetCommentThreadQuery(
    Guid RootCommentId,
    CommentSortField SortBy = CommentSortField.CreatedAtUtc,
    CommentSortDirection SortDirection = CommentSortDirection.Desc) : IRequest<CommentDto>;
