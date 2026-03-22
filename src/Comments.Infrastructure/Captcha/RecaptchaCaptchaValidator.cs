// File overview: reCAPTCHA validator that verifies user tokens through the configured verification endpoint.
using System.Text.Json;
using Comments.Application.Abstractions;

namespace Comments.Infrastructure.Captcha;

/// <summary>
/// Validates CAPTCHA tokens against Google reCAPTCHA verification API.
/// </summary>
public sealed class RecaptchaCaptchaValidator : ICaptchaValidator
{
    private readonly CaptchaOptions _options;
    private readonly HttpClient _httpClient;

    /// <summary>
    /// Creates a new <see cref="RecaptchaCaptchaValidator"/> instance.
    /// </summary>
    /// <param name="options">CAPTCHA settings with enabled flag, secret key and verify endpoint.</param>
    /// <param name="httpClient">HTTP client used for verification requests.</param>
    public RecaptchaCaptchaValidator(CaptchaOptions options, HttpClient httpClient)
    {
        _options = options;
        _httpClient = httpClient;
    }

    /// <summary>
    /// Validates a client reCAPTCHA token and returns whether verification succeeded.
    /// </summary>
    /// <param name="token">User-provided CAPTCHA token.</param>
    /// <param name="cancellationToken">Cancellation token for the HTTP request.</param>
    /// <returns><c>true</c> when CAPTCHA is disabled or token verification succeeds; otherwise <c>false</c>.</returns>
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
