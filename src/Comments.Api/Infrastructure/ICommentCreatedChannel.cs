using Comments.Application.DTOs;

namespace Comments.Api.Infrastructure;

public interface ICommentCreatedChannel
{
    Task PublishAsync(CommentDto comment, CancellationToken cancellationToken);
}
