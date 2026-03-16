using Microsoft.Extensions.Caching.Memory;

namespace Comments.Api.Infrastructure;

public sealed class BasicCaptchaChallengeStore
{
    private static readonly TimeSpan ChallengeTtl = TimeSpan.FromMinutes(5);

    private readonly IMemoryCache _cache;

    public BasicCaptchaChallengeStore(IMemoryCache cache)
    {
        _cache = cache;
    }

    public string CreateChallenge(string answer)
    {
        var challengeId = Guid.NewGuid().ToString("N");
        _cache.Set(challengeId, answer, ChallengeTtl);
        return challengeId;
    }

    public bool Validate(string challengeId, string answer)
    {
        if (!_cache.TryGetValue<string>(challengeId, out var expectedAnswer)
            || string.IsNullOrWhiteSpace(expectedAnswer))
        {
            return false;
        }

        _cache.Remove(challengeId);
        return string.Equals(expectedAnswer, answer.Trim(), StringComparison.OrdinalIgnoreCase);
    }
}
