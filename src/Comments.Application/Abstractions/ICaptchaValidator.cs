

namespace Comments.Application.Abstractions;
/// <summary>
/// Контракт перевірки captcha-токена перед створенням коментаря.
/// </summary>
public interface ICaptchaValidator
{
    /// <summary>
    /// Валідовує captcha-токен користувача.
    /// </summary>
    /// <param name="token">Токен, переданий клієнтом.</param>
    /// <param name="cancellationToken">Токен скасування.</param>
    /// <returns><c>true</c>, якщо токен валідний; інакше <c>false</c>.</returns>
    Task<bool> ValidateAsync(string? token, CancellationToken cancellationToken);
}
