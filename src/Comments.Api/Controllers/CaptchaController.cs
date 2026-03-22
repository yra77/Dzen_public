// File overview: REST API controller that issues CAPTCHA image challenges to clients.
using Comments.Infrastructure.Captcha;
using Microsoft.AspNetCore.Mvc;

namespace Comments.Api.Controllers;

/// <summary>
/// REST endpoints для генерації captcha-челенджу у форматі SVG.
/// </summary>
[ApiController]
[Route("api/captcha")]
public sealed class CaptchaController : ControllerBase
{
    private readonly CaptchaChallengeService _captchaChallengeService;

    /// <summary>
    /// Ініціалізує контролер captcha.
    /// </summary>
    /// <param name="captchaChallengeService">Сервіс генерації challenge і SVG payload.</param>
    public CaptchaController(CaptchaChallengeService captchaChallengeService)
    {
        _captchaChallengeService = captchaChallengeService;
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
        var payload = _captchaChallengeService.CreateImagePayload();
        return Ok(new CaptchaImageResponse(payload.ChallengeId, payload.ImageBase64, payload.MimeType, payload.TtlSeconds));
    }
}
