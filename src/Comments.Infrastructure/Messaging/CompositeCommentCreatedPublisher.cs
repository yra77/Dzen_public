using Comments.Application.Abstractions;
using Comments.Application.DTOs;

namespace Comments.Infrastructure.Messaging;

/// <summary>
/// Паблішер, що делегує доставку події створення коментаря у всі зареєстровані канали.
/// </summary>
public sealed class CompositeCommentCreatedPublisher : ICommentCreatedPublisher
{
    private readonly IReadOnlyCollection<ICommentCreatedChannel> _channels;

    /// <summary>
    /// Ініціалізує composite-паблішер із набором цільових каналів доставлення.
    /// </summary>
    /// <param name="channels">Канали, у які потрібно публікувати подію.</param>
    public CompositeCommentCreatedPublisher(IEnumerable<ICommentCreatedChannel> channels)
    {
        _channels = channels.ToArray();
    }

    /// <summary>
    /// Публікує подію у всі підключені канали послідовно.
    /// </summary>
    /// <param name="comment">DTO створеного коментаря.</param>
    /// <param name="cancellationToken">Токен скасування.</param>
    public async Task PublishAsync(CommentDto comment, CancellationToken cancellationToken)
    {
        foreach (var channel in _channels)
        {
            await channel.PublishAsync(comment, cancellationToken);
        }
    }
}
