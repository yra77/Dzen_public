using Comments.Application.Abstractions;
using Comments.Application.DTOs;

using MassTransit;

namespace Comments.Infrastructure.Messaging;

/// <summary>
/// Канал публікації події створення коментаря через MassTransit.
/// </summary>
public sealed class MassTransitCommentCreatedPublisher : ICommentCreatedChannel
{
    private readonly IPublishEndpoint _publishEndpoint;

    /// <summary>
    /// Ініціалізує паблішер із транспортним endpoint-ом MassTransit.
    /// </summary>
    /// <param name="publishEndpoint">Endpoint для публікації інтеграційних подій.</param>
    public MassTransitCommentCreatedPublisher(IPublishEndpoint publishEndpoint)
    {
        _publishEndpoint = publishEndpoint;
    }

    /// <summary>
    /// Публікує задачі індексації та, за потреби, задачу обробки вкладення.
    /// </summary>
    /// <param name="comment">DTO створеного коментаря.</param>
    /// <param name="cancellationToken">Токен скасування.</param>
    public async Task PublishAsync(CommentDto comment, CancellationToken cancellationToken)
    {
        await _publishEndpoint.Publish(new CommentIndexingRequested(comment), cancellationToken);

        if (comment.Attachment is not null)
        {
            await _publishEndpoint.Publish(new CommentFileProcessingRequested(comment), cancellationToken);
        }
    }
}
