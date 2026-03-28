

using Comments.Application.DTOs;
using MediatR;


namespace Comments.Application.Features.Comments.Commands.CreateComment;
/// <summary>
/// Команда CQRS для створення нового коментаря з опційним вкладенням.
/// </summary>
/// <param name="Request">Дані форми створення коментаря.</param>
public sealed record CreateCommentCommand(CreateCommentRequest Request) : IRequest<CommentDto>;