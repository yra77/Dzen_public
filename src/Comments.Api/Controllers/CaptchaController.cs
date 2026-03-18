using Comments.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using System.Text;

namespace Comments.Api.Controllers;

/// <summary>
/// REST endpoints для генерації captcha-челенджу у форматі SVG.
/// </summary>
[ApiController]
[Route("api/captcha")]
public sealed class CaptchaController : ControllerBase
{
    private readonly BasicCaptchaChallengeStore _challengeStore;

    /// <summary>
    /// Ініціалізує контролер captcha.
    /// </summary>
    /// <param name="challengeStore">Сховище активних captcha-челенджів.</param>
    public CaptchaController(BasicCaptchaChallengeStore challengeStore)
    {
        _challengeStore = challengeStore;
    }

    /// <summary>
    /// DTO відповіді з даними captcha-зображення.
    /// </summary>
    /// <param name="ChallengeId">Ідентифікатор challenge для подальшої валідації.</param>
    /// <param name="ImageBase64">SVG-зображення у base64.</param>
    /// <param name="MimeType">MIME-тип зображення.</param>
    /// <param name="TtlSeconds">TTL челенджу в секундах.</param>
    public sealed record CaptchaImageResponse(string ChallengeId, string ImageBase64, string MimeType, int TtlSeconds);

    /// <summary>
    /// Генерує новий captcha-челендж і повертає SVG-картинку.
    /// </summary>
    /// <returns>HTTP 200 із даними challenge та base64-зображенням.</returns>
    [HttpGet("image")]
    [ProducesResponseType(typeof(CaptchaImageResponse), StatusCodes.Status200OK)]
    public IActionResult GetImage()
    {
        var challengeText = GenerateCaptchaText(6);
        var challengeId = _challengeStore.CreateChallenge(challengeText);
        var svg = BuildSvg(challengeText);
        var imageBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(svg));

        return Ok(new CaptchaImageResponse(challengeId, imageBase64, "image/svg+xml", 300));
    }


    /// <summary>
    /// Генерує captcha-рядок із латинських літер та цифр.
    /// </summary>
    /// <param name="length">Довжина рядка captcha.</param>
    /// <returns>Випадковий captcha-рядок.</returns>
    private static string GenerateCaptchaText(int length)
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var chars = new char[length];

        for (var index = 0; index < length; index++)
        {
            chars[index] = alphabet[Random.Shared.Next(alphabet.Length)];
        }

        return new string(chars);
    }

    /// <summary>
    /// Будує SVG-розмітку captcha із візуальним шумом.
    /// </summary>
    /// <param name="text">Текст математичного прикладу.</param>
    /// <returns>Рядок SVG-документу.</returns>
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
    <text x="80" y="38" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" fill="#111827" letter-spacing="2">{escaped}</text>
</svg>
""";
    }
}
