

using Comments.Application.DTOs;
using Comments.Application.Abstractions;

using Microsoft.AspNetCore.SignalR;


namespace Comments.Infrastructure.Realtime;
/// <summary>
/// Канал публікації створених коментарів у SignalR Hub для realtime-оновлень клієнтів.
/// </summary>
public sealed class SignalRCommentCreatedChannel : ICommentCreatedChannel
{


    private readonly IHubContext<CommentsHub> _hubContext;


    /// <summary>
    /// Ініціалізує канал із контекстом SignalR Hub.
    /// </summary>
    /// <param name="hubContext">Контекст хаба для push-повідомлень клієнтам.</param>
    public SignalRCommentCreatedChannel(IHubContext<CommentsHub> hubContext)
    {
        _hubContext = hubContext;
    }


    /// <summary>
    /// Публікує подію <c>commentCreated</c> для всіх підключених SignalR-клієнтів.
    /// </summary>
    /// <param name="comment">DTO створеного коментаря.</param>
    /// <param name="cancellationToken">Токен скасування.</param>
    public Task PublishAsync(CommentDto comment, CancellationToken cancellationToken)
    {
        return _hubContext.Clients.All.SendAsync("commentCreated", comment, cancellationToken);
    }
}