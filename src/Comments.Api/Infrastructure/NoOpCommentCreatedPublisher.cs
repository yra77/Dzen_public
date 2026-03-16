using Comments.Application.Abstractions;
using Comments.Application.DTOs;

namespace Comments.Api.Infrastructure;

public sealed class NoOpCommentCreatedPublisher : ICommentCreatedPublisher
{
    public Task PublishAsync(CommentDto comment, CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
