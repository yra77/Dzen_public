using Comments.Application.Services;
using MediatR;

namespace Comments.Application.Features.Comments.Queries.PreviewComment;

/// <summary>
/// Обробник CQRS-запиту генерації preview для тексту коментаря.
/// </summary>
public sealed class PreviewCommentQueryHandler : IRequestHandler<PreviewCommentQuery, string>
{
    private readonly CommentService _commentService;

    /// <summary>
    /// Ініціалізує новий екземпляр <see cref="PreviewCommentQueryHandler"/>.
    /// </summary>
    /// <param name="commentService">Сервіс бізнес-логіки коментарів.</param>
    public PreviewCommentQueryHandler(CommentService commentService)
    {
        _commentService = commentService;
    }

    /// <summary>
    /// Обробляє запит preview і повертає санітизований HTML.
    /// </summary>
    /// <param name="request">Запит із текстом для preview.</param>
    /// <param name="cancellationToken">Токен скасування.</param>
    /// <returns>Санітизований HTML-preview.</returns>
    public Task<string> Handle(PreviewCommentQuery request, CancellationToken cancellationToken)
    {
        return Task.FromResult(_commentService.Preview(request.Text));
    }
}
