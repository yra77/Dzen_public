using Comments.Application.DTOs;
using MediatR;

namespace Comments.Application.Features.Comments.Queries.GetCommentThread;

public sealed record GetCommentThreadQuery(
    Guid RootCommentId,
    CommentSortField SortBy = CommentSortField.CreatedAtUtc,
    CommentSortDirection SortDirection = CommentSortDirection.Desc) : IRequest<CommentDto>;
