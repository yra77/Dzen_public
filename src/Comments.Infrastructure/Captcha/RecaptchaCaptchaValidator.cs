using System.Text.Json;
using Comments.Application.Abstractions;

namespace Comments.Infrastructure.Captcha;

public sealed class RecaptchaCaptchaValidator : ICaptchaValidator
{
    private readonly CaptchaOptions _options;
    private readonly HttpClient _httpClient;

    public RecaptchaCaptchaValidator(CaptchaOptions options, HttpClient httpClient)
    {
        _options = options;
        _httpClient = httpClient;
    }

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
