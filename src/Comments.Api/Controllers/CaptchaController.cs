using Comments.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using System.Text;

namespace Comments.Api.Controllers;

[ApiController]
[Route("api/captcha")]
public sealed class CaptchaController : ControllerBase
{
    private readonly BasicCaptchaChallengeStore _challengeStore;

    public CaptchaController(BasicCaptchaChallengeStore challengeStore)
    {
        _challengeStore = challengeStore;
    }

    public sealed record CaptchaImageResponse(string ChallengeId, string ImageBase64, string MimeType, int TtlSeconds);

    [HttpGet("image")]
    [ProducesResponseType(typeof(CaptchaImageResponse), StatusCodes.Status200OK)]
    public IActionResult GetImage()
    {
        var random = Random.Shared;
        var left = random.Next(1, 10);
        var right = random.Next(1, 10);
        var answer = (left + right).ToString();

        var challengeId = _challengeStore.CreateChallenge(answer);
        var svg = BuildSvg($"{left} + {right} = ?");
        var imageBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(svg));

        return Ok(new CaptchaImageResponse(challengeId, imageBase64, "image/svg+xml", 300));
    }

    private static string BuildSvg(string text)
    {
        var escaped = System.Security.SecurityElement.Escape(text) ?? text;
        var noise1 = Random.Shared.Next(10, 130);
        var noise2 = Random.Shared.Next(10, 130);
        var noise3 = Random.Shared.Next(10, 130);
        var noise4 = Random.Shared.Next(10, 130);

        return $"""
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60">
  <rect width="160" height="60" fill="#f3f4f6"/>
  <line x1="0" y1="{noise1}" x2="160" y2="{noise2}" stroke="#9ca3af" stroke-width="1"/>
  <line x1="0" y1="{noise3}" x2="160" y2="{noise4}" stroke="#d1d5db" stroke-width="1"/>
  <text x="80" y="38" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" fill="#111827">{escaped}</text>
</svg>
""";
    }
}
