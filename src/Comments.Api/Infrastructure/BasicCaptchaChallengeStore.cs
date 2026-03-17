using Microsoft.Extensions.Caching.Memory;

namespace Comments.Api.Infrastructure;

/// <summary>
/// In-memory store for short-lived captcha challenges used by the basic captcha flow.
/// </summary>
public sealed class BasicCaptchaChallengeStore
{
    /// <summary>
    /// Standard TTL for generated captcha challenges.
    /// </summary>
    private static readonly TimeSpan ChallengeTtl = TimeSpan.FromMinutes(5);

    private readonly IMemoryCache _cache;

    /// <summary>
    /// Initializes challenge store with memory cache backend.
    /// </summary>
    /// <param name="cache">Memory cache used to store expected captcha answers.</param>
    public BasicCaptchaChallengeStore(IMemoryCache cache)
    {
        _cache = cache;
    }

    /// <summary>
    /// Creates a new captcha challenge and stores expected answer by generated challenge identifier.
    /// </summary>
    /// <param name="answer">Expected user answer for the generated challenge.</param>
    /// <returns>Generated challenge identifier.</returns>
    public string CreateChallenge(string answer)
    {
        var challengeId = Guid.NewGuid().ToString("N");
        _cache.Set(challengeId, answer, ChallengeTtl);
        return challengeId;
    }

    /// <summary>
    /// Validates challenge answer and invalidates challenge after first validation attempt.
    /// </summary>
    /// <param name="challengeId">Identifier of the challenge previously returned by <see cref="CreateChallenge"/>.</param>
    /// <param name="answer">User-provided answer for the challenge.</param>
    /// <returns><see langword="true"/> when answer is correct; otherwise <see langword="false"/>.</returns>
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
