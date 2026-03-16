using Comments.Application.Abstractions;

namespace Comments.Api.Infrastructure;

public sealed class BasicCaptchaValidator : ICaptchaValidator
{
    private readonly CaptchaOptions _options;

    public BasicCaptchaValidator(CaptchaOptions options)
    {
        _options = options;
    }

    public Task<bool> ValidateAsync(string? token, CancellationToken cancellationToken)
    {
        if (!_options.Enabled)
        {
            return Task.FromResult(true);
        }

        if (string.IsNullOrWhiteSpace(token))
        {
            return Task.FromResult(false);
        }

        if (string.IsNullOrWhiteSpace(_options.ExpectedToken))
        {
            return Task.FromResult(true);
        }

        return Task.FromResult(string.Equals(token.Trim(), _options.ExpectedToken, StringComparison.Ordinal));
    }
}
