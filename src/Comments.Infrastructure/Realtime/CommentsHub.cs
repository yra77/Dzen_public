

using Microsoft.AspNetCore.SignalR;


namespace Comments.Infrastructure.Realtime;
/// <summary>
/// SignalR Hub, який використовується клієнтами для підписки на події створення коментарів у режимі реального часу.
/// </summary>
public sealed class CommentsHub : Hub{}