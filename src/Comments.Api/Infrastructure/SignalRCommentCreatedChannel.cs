using Comments.Api.Realtime;
using Comments.Application.DTOs;
using Microsoft.AspNetCore.SignalR;

namespace Comments.Api.Infrastructure;

public sealed class SignalRCommentCreatedChannel : ICommentCreatedChannel
{
    private readonly IHubContext<CommentsHub> _hubContext;

    public SignalRCommentCreatedChannel(IHubContext<CommentsHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task PublishAsync(CommentDto comment, CancellationToken cancellationToken)
    {
        return _hubContext.Clients.All.SendAsync("commentCreated", comment, cancellationToken);
    }
}
