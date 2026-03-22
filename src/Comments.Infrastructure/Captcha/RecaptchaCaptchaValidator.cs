

using System.Text.Json;

using Comments.Application.Abstractions;


namespace Comments.Infrastructure.Captcha;
/// <summary>
/// Валідатор reCAPTCHA, який перевіряє токени користувачів через налаштовану кінцеву точку перевірки.
/// Перевіряє токени CAPTCHA за допомогою API перевірки reCAPTCHA від Google.
/// </summary>
public sealed class RecaptchaCaptchaValidator : ICaptchaValidator
{


    private readonly CaptchaOptions _options;
    private readonly HttpClient _httpClient;


    /// <summary>
    /// Створює новий екземпляр <see cref="RecaptchaCaptchaValidator"/>.
    /// </summary>
    /// <param name="options">CAPTCHA налаштування з увімкненим прапорцем, секретним ключем та перевіркою кінцевої точки.</param>
    /// <param name="httpClient">HTTP клієнт, який використовується для запитів на перевірку.</param>
    public RecaptchaCaptchaValidator(CaptchaOptions options, HttpClient httpClient)
    {
        _options = options;
        _httpClient = httpClient;
    }


    /// <summary>
    /// Перевіряє токен reCAPTCHA клієнта та повертає інформацію про успішність перевірки.
    /// </summary>
    /// <param name="token">Токен CAPTCHA, наданий користувачем</param>
    /// <param name="cancellationToken">Cancellation token for the HTTP request.</param>
    /// <returns><c>true</c> коли CAPTCHA вимкнено або перевірка токена пройшла успішно; в іншому випадку <c>false</c>.</returns>
    public async Task<bool> ValidateAsync(string? token, CancellationToken cancellationToken)
    {
        if (!_options.Enabled)
        {
            return true;
        }

        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(_options.SecretKey))
        {
            return false;
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, _options.VerifyEndpoint)
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["secret"] = _options.SecretKey,
                ["response"] = token.Trim()
            })
        };

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return false;
        }

        await using var responseStream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var json = await JsonDocument.ParseAsync(responseStream, cancellationToken: cancellationToken);

        return json.RootElement.TryGetProperty("success", out var success)
               && success.ValueKind == JsonValueKind.True;
    }
}
