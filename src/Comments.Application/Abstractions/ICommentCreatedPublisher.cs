using Comments.Application.DTOs;

namespace Comments.Application.Abstractions;

public interface ICommentCreatedPublisher
{
    Task PublishAsync(CommentDto comment, CancellationToken cancellationToken);
}
