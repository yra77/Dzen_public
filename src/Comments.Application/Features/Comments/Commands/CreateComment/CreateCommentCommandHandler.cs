using Comments.Application.DTOs;
using Comments.Application.Services;
using MediatR;

namespace Comments.Application.Features.Comments.Commands.CreateComment;

/// <summary>
/// Обробник CQRS-команди створення коментаря через доменний сервіс.
/// </summary>
public sealed class CreateCommentCommandHandler : IRequestHandler<CreateCommentCommand, CommentDto>
{
    private readonly CommentService _commentService;

    /// <summary>
    /// Ініціалізує новий екземпляр <see cref="CreateCommentCommandHandler"/>.
    /// </summary>
    /// <param name="commentService">Сервіс, що інкапсулює бізнес-логіку створення коментаря.</param>
    public CreateCommentCommandHandler(CommentService commentService)
    {
        _commentService = commentService;
    }

    /// <summary>
    /// Обробляє команду створення коментаря.
    /// </summary>
    /// <param name="request">Команда з payload форми.</param>
    /// <param name="cancellationToken">Токен скасування.</param>
    /// <returns>Створений коментар у DTO-форматі.</returns>
    public Task<CommentDto> Handle(CreateCommentCommand request, CancellationToken cancellationToken)
    {
        return _commentService.CreateAsync(request.Request, cancellationToken);
    }
}
