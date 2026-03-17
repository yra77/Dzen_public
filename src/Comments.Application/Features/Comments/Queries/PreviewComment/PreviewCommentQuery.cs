using MediatR;

namespace Comments.Application.Features.Comments.Queries.PreviewComment;

/// <summary>
/// CQRS-запит для отримання HTML-preview тексту коментаря.
/// </summary>
/// <param name="Text">Сирий текст коментаря для попереднього перегляду.</param>
public sealed record PreviewCommentQuery(string Text) : IRequest<string>;
