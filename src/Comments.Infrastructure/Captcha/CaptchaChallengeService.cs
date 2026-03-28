

using System.Globalization;
using System.Text;


namespace Comments.Infrastructure.Captcha;
/// <summary>
/// Генерує captcha-челендж і SVG-зображення для REST/GraphQL transport-шарів.
/// </summary>
public sealed class CaptchaChallengeService
{


    private readonly BasicCaptchaChallengeStore _challengeStore;


    /// <summary>
    /// Ініціалізує сервіс генерації captcha.
    /// </summary>
    /// <param name="challengeStore">Сховище активних challenge для подальшої валідації.</param>
    public CaptchaChallengeService(BasicCaptchaChallengeStore challengeStore)
    {
        _challengeStore = challengeStore;
    }


    /// <summary>
    /// Створює новий challenge та повертає зображення captcha у base64.
    /// </summary>
    /// <returns>DTO з challenge id, MIME-типом і TTL.</returns>
    public CaptchaImagePayload CreateImagePayload()
    {
        var challengeText = GenerateCaptchaText(6);
        var challengeId = _challengeStore.CreateChallenge(challengeText);
        var svg = BuildSvg(challengeText);
        var imageBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(svg));

        return new CaptchaImagePayload(challengeId, imageBase64, "image/svg+xml", 300);
    }

    /// <summary>
    /// DTO payload для captcha-зображення.
    /// </summary>
    /// <param name="ChallengeId">Ідентифікатор challenge для формування captchaToken.</param>
    /// <param name="ImageBase64">SVG у base64 форматі.</param>
    /// <param name="MimeType">MIME-тип зображення.</param>
    /// <param name="TtlSeconds">Час життя challenge у секундах.</param>
    public sealed record CaptchaImagePayload(string ChallengeId, string ImageBase64, string MimeType, int TtlSeconds);

    /// <summary>
    /// Генерує captcha-рядок із латинських літер та цифр.
    /// </summary>
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
    /// Будує SVG-розмітку captcha із шумом і псевдо-символами.
    /// </summary>
    private static string BuildSvg(string text)
    {
        var svgBuilder = new StringBuilder();
        var turbulenceSeed = Random.Shared.Next(1, 5000);

        svgBuilder.AppendLine("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"160\" height=\"60\" viewBox=\"0 0 160 60\">");
        svgBuilder.AppendLine("  <defs>");
        svgBuilder.AppendLine("    <filter id=\"roughen\" x=\"-20%\" y=\"-20%\" width=\"140%\" height=\"140%\">");
        svgBuilder.AppendLine($"      <feTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"1\" seed=\"{turbulenceSeed}\" result=\"noise\"/>");
        svgBuilder.AppendLine("      <feDisplacementMap in=\"SourceGraphic\" in2=\"noise\" scale=\"2.6\" xChannelSelector=\"R\" yChannelSelector=\"G\"/>");
        svgBuilder.AppendLine("    </filter>");
        svgBuilder.AppendLine("  </defs>");
        svgBuilder.AppendLine("  <rect width=\"160\" height=\"60\" fill=\"#f3f4f6\"/>");

        AppendNoiseLines(svgBuilder);
        AppendNoiseDots(svgBuilder);
        AppendDecoyCharacters(svgBuilder);

        svgBuilder.AppendLine("  <g filter=\"url(#roughen)\">");

        for (var index = 0; index < text.Length; index++)
        {
            var character = System.Security.SecurityElement.Escape(text[index].ToString()) ?? text[index].ToString();
            var x = 18 + (index * 22) + Random.Shared.Next(-2, 3);
            var y = 36 + Random.Shared.Next(-8, 9);
            var rotation = Random.Shared.Next(-30, 31);
            var fontSize = Random.Shared.Next(24, 31);
            var opacity = Random.Shared.NextDouble() * 0.30 + 0.70;

            svgBuilder.AppendLine(
                $"    <text x=\"{x}\" y=\"{y}\" transform=\"rotate({rotation} {x} {y})\" font-size=\"{fontSize}\" font-family=\"Arial, Helvetica, sans-serif\" font-weight=\"700\" fill=\"#111827\" fill-opacity=\"{opacity.ToString("0.00", CultureInfo.InvariantCulture)}\" letter-spacing=\"1\">{character}</text>");
        }

        svgBuilder.AppendLine("  </g>");
        svgBuilder.AppendLine("</svg>");
        return svgBuilder.ToString();
    }

    /// <summary>
    /// Додає випадкові лінії як візуальний шум.
    /// </summary>
    private static void AppendNoiseLines(StringBuilder svgBuilder)
    {
        for (var index = 0; index < 12; index++)
        {
            var x1 = Random.Shared.Next(0, 161);
            var y1 = Random.Shared.Next(0, 61);
            var x2 = Random.Shared.Next(0, 161);
            var y2 = Random.Shared.Next(0, 61);
            var controlX = Random.Shared.Next(0, 161);
            var controlY = Random.Shared.Next(0, 61);
            var strokeWidth = Random.Shared.NextDouble() * 1.2 + 0.6;
            var opacity = Random.Shared.NextDouble() * 0.35 + 0.25;

            svgBuilder.AppendLine($"  <path d=\"M{x1},{y1} Q{controlX},{controlY} {x2},{y2}\" stroke=\"#6b7280\" stroke-opacity=\"{opacity.ToString("0.00", CultureInfo.InvariantCulture)}\" stroke-width=\"{strokeWidth.ToString("0.00", CultureInfo.InvariantCulture)}\" fill=\"none\"/>");
        }
    }

    /// <summary>
    /// Додає дрібні точки-шум для ускладнення OCR.
    /// </summary>
    private static void AppendNoiseDots(StringBuilder svgBuilder)
    {
        for (var index = 0; index < 90; index++)
        {
            var cx = Random.Shared.Next(0, 161);
            var cy = Random.Shared.Next(0, 61);
            var radius = Random.Shared.NextDouble() * 1.4 + 0.2;
            var opacity = Random.Shared.NextDouble() * 0.30 + 0.08;

            svgBuilder.AppendLine(
                $"  <circle cx=\"{cx}\" cy=\"{cy}\" r=\"{radius.ToString("0.00", CultureInfo.InvariantCulture)}\" fill=\"#4b5563\" fill-opacity=\"{opacity.ToString("0.00", CultureInfo.InvariantCulture)}\"/>");
        }
    }

    /// <summary>
    /// Додає псевдо-символи, що не входять до відповіді challenge.
    /// </summary>
    private static void AppendDecoyCharacters(StringBuilder svgBuilder)
    {
        const string decoyAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

        for (var index = 0; index < 7; index++)
        {
            var decoyCharacter = decoyAlphabet[Random.Shared.Next(decoyAlphabet.Length)];
            var x = Random.Shared.Next(4, 155);
            var y = Random.Shared.Next(12, 54);
            var fontSize = Random.Shared.Next(12, 22);
            var rotation = Random.Shared.Next(-70, 71);
            var opacity = Random.Shared.NextDouble() * 0.22 + 0.10;

            svgBuilder.AppendLine($"  <text x=\"{x}\" y=\"{y}\" transform=\"rotate({rotation} {x} {y})\" font-size=\"{fontSize}\" font-family=\"Arial, Helvetica, sans-serif\" fill=\"#1f2937\" fill-opacity=\"{opacity.ToString("0.00", CultureInfo.InvariantCulture)}\">{decoyCharacter}</text>");
        }
    }
}