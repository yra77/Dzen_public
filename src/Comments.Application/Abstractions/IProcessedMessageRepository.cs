

namespace Comments.Application.Abstractions;
/// <summary>
/// Контракт ідемпотентності обробки вхідних повідомлень інтеграції.
/// </summary>
public interface IProcessedMessageRepository
{
    /// <summary>
    /// Намагається позначити повідомлення як оброблене.
    /// </summary>
    /// <param name="messageId">Стабільний ідентифікатор повідомлення.</param>
    /// <param name="cancellationToken">Токен скасування.</param>
    /// <returns><c>true</c>, якщо повідомлення позначено вперше; інакше <c>false</c>.</returns>
    Task<bool> TryMarkProcessedAsync(string messageId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Видаляє застарілі записи ідемпотентності до вказаної UTC-мітки часу.
    /// </summary>
    /// <param name="olderThanUtc">Граничний час (UTC): видаляються всі записи старіші за нього.</param>
    /// <param name="cancellationToken">Токен скасування.</param>
    /// <returns>Кількість видалених записів.</returns>
    Task<int> CleanupOlderThanAsync(DateTime olderThanUtc, CancellationToken cancellationToken = default);
}
