using Comments.Application.Abstractions;

namespace Comments.Api.Infrastructure;

public sealed class BasicCaptchaValidator : ICaptchaValidator
{
    private readonly CaptchaOptions _options;
    private readonly BasicCaptchaChallengeStore _challengeStore;

    public BasicCaptchaValidator(CaptchaOptions options, BasicCaptchaChallengeStore challengeStore)
    {
        _options = options;
        _challengeStore = challengeStore;
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
            if (string.IsNullOrWhiteSpace(token))
            {
                return Task.FromResult(false);
            }

            var separatorIndex = token.IndexOf(':', StringComparison.Ordinal);
            if (separatorIndex <= 0 || separatorIndex == token.Length - 1)
            {
                return Task.FromResult(false);
            }

            var challengeId = token[..separatorIndex].Trim();
            var answer = token[(separatorIndex + 1)..].Trim();
            if (string.IsNullOrWhiteSpace(challengeId) || string.IsNullOrWhiteSpace(answer))
            {
                return Task.FromResult(false);
            }

            var isValid = _challengeStore.Validate(challengeId, answer);
            return Task.FromResult(isValid);
        }

        return Task.FromResult(string.Equals(token.Trim(), _options.ExpectedToken, StringComparison.Ordinal));
    }
}
