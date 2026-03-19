using Microsoft.AspNetCore.SignalR;

namespace Comments.Infrastructure.Realtime;

/// <summary>
/// SignalR hub used by clients to subscribe to realtime comment creation events.
/// </summary>
public sealed class CommentsHub : Hub
{
}
