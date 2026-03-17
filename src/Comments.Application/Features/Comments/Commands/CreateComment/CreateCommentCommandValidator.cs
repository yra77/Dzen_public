using FluentValidation;
using System.Text.RegularExpressions;
using Comments.Application.Abstractions;

namespace Comments.Application.Features.Comments.Commands.CreateComment;

/// <summary>
/// Валідатор команди створення коментаря відповідно до контракту ТЗ.
/// </summary>
public sealed class CreateCommentCommandValidator : AbstractValidator<CreateCommentCommand>
{
    private const int MaxAttachmentSizeBytes = 1_000_000;
    private static readonly Regex UserNameRegex = new("^[a-zA-Z0-9]+$", RegexOptions.Compiled);
    private static readonly HashSet<string> AllowedAttachmentContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "text/plain",
        "image/png",
        "image/jpeg",
        "image/gif"
    };

    /// <summary>
    /// Ініціалізує валідатор і реєструє набір правил для створення коментаря.
    /// </summary>
    /// <param name="captchaValidator">Сервіс перевірки captcha-токена.</param>
    public CreateCommentCommandValidator(ICaptchaValidator captchaValidator)
    {
        RuleFor(x => x.Request.UserName)
            .NotEmpty()
            .MaximumLength(100)
            .Must(name => UserNameRegex.IsMatch(name.Trim()))
            .WithMessage("User name must contain only latin letters and digits.");

        RuleFor(x => x.Request.Email)
            .NotEmpty()
            .MaximumLength(200)
            .EmailAddress();

        RuleFor(x => x.Request.HomePage)
            .MaximumLength(2048)
            .Must(BeValidHomePageUrl)
            .When(x => !string.IsNullOrWhiteSpace(x.Request.HomePage))
            .WithMessage("Home page must be a valid absolute URL with http/https scheme.");

        RuleFor(x => x.Request.Text)
            .NotEmpty()
            .MaximumLength(5000);

        RuleFor(x => x.Request.CaptchaToken)
            .MustAsync(async (command, token, cancellationToken) => await captchaValidator.ValidateAsync(token, cancellationToken))
            .WithMessage("Captcha validation failed.");

        RuleFor(x => x.Request.Attachment)
            .Must(HasValidAttachment)
            .When(x => x.Request.Attachment is not null)
            .WithMessage("Attachment is invalid. Ensure file name, content type and base64 payload are valid.");

        RuleFor(x => x.Request.Attachment)
            .Must(HasAllowedAttachmentSize)
            .When(x => x.Request.Attachment is not null)
            .WithMessage($"Attachment exceeds max size {MaxAttachmentSizeBytes} bytes.");
    }

    /// <summary>
    /// Перевіряє, що homepage є абсолютним HTTP/HTTPS URL.
    /// </summary>
    /// <param name="homePage">URL домашньої сторінки, введений користувачем.</param>
    /// <returns><see langword="true"/>, якщо URL валідний або порожній; інакше <see langword="false"/>.</returns>
    private static bool BeValidHomePageUrl(string? homePage)
    {
        if (string.IsNullOrWhiteSpace(homePage))
        {
            return true;
        }

        return Uri.TryCreate(homePage.Trim(), UriKind.Absolute, out var uri)
               && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }

    /// <summary>
    /// Перевіряє коректність вкладення: назва файлу, MIME-тип та Base64-контент.
    /// </summary>
    /// <param name="attachment">Модель вкладення.</param>
    /// <returns><see langword="true"/>, якщо вкладення проходить всі перевірки.</returns>
    private static bool HasValidAttachment(AttachmentUploadRequest? attachment)
    {
        if (attachment is null)
        {
            return true;
        }

        if (string.IsNullOrWhiteSpace(attachment.FileName))
        {
            return false;
        }

        if (!AllowedAttachmentContentTypes.Contains(attachment.ContentType))
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(attachment.Base64Content))
        {
            return false;
        }

        try
        {
            _ = Convert.FromBase64String(attachment.Base64Content);
            return true;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    /// <summary>
    /// Перевіряє, що декодований base64-контент вкладення не перевищує 1MB.
    /// </summary>
    /// <param name="attachment">Модель вкладення.</param>
    /// <returns><see langword="true"/>, якщо розмір не перевищує ліміт або вкладення відсутнє.</returns>
    private static bool HasAllowedAttachmentSize(AttachmentUploadRequest? attachment)
    {
        if (attachment is null)
        {
            return true;
        }

        try
        {
            var bytes = Convert.FromBase64String(attachment.Base64Content);
            return bytes.Length <= MaxAttachmentSizeBytes;
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
