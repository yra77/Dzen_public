

namespace Comments.Infrastructure.Captcha;
/// <summary>
/// Конфігурація CAPTCHA-провайдера для захисту endpoint-ів створення коментарів.
/// </summary>
public sealed class CaptchaOptions
{
    /// <summary>
    /// Вмикає/вимикає перевірку CAPTCHA.
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Назва провайдера (<c>Basic</c>, <c>Recaptcha</c> тощо).
    /// </summary>
    public string Provider { get; set; } = "Basic";

    /// <summary>
    /// Фіксований тестовий токен для non-prod режимів (опційно).
    /// </summary>
    public string? ExpectedToken { get; set; }

    /// <summary>
    /// Endpoint верифікації токена reCAPTCHA.
    /// </summary>
    public string VerifyEndpoint { get; set; } = "https://www.google.com/recaptcha/api/siteverify";

    /// <summary>
    /// Секретний ключ reCAPTCHA.
    /// </summary>
    public string? SecretKey { get; set; }
}
