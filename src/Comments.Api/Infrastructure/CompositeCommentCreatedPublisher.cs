using Comments.Application.Abstractions;
using Comments.Application.DTOs;

namespace Comments.Api.Infrastructure;

public sealed class CompositeCommentCreatedPublisher : ICommentCreatedPublisher
{
    private readonly IReadOnlyCollection<ICommentCreatedChannel> _channels;

    public CompositeCommentCreatedPublisher(IEnumerable<ICommentCreatedChannel> channels)
    {
        _channels = channels.ToArray();
    }

    public async Task PublishAsync(CommentDto comment, CancellationToken cancellationToken)
    {
        foreach (var channel in _channels)
        {
            await channel.PublishAsync(comment, cancellationToken);
        }
    }
}
