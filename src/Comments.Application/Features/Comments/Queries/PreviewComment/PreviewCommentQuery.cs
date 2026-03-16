using MediatR;

namespace Comments.Application.Features.Comments.Queries.PreviewComment;

public sealed record PreviewCommentQuery(string Text) : IRequest<string>;
