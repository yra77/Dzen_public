namespace Comments.Application.DTOs;

/// <summary>
/// DTO запиту на створення коментаря.
/// </summary>
/// <param name="UserName">Ім'я користувача (латиниця та цифри).</param>
/// <param name="Email">Email користувача.</param>
/// <param name="HomePage">Опціональна домашня сторінка користувача.</param>
/// <param name="Text">Текст коментаря.</param>
/// <param name="ParentId">ID батьківського коментаря для reply-сценарію.</param>
/// <param name="CaptchaToken">Токен captcha для валідації запиту.</param>
/// <param name="Attachment">Опціональне вкладення.</param>
public sealed record CreateCommentRequest(
    string UserName,
    string Email,
    string? HomePage,
    string Text,
    Guid? ParentId,
    string? CaptchaToken,
    AttachmentUploadRequest? Attachment);

/// <summary>
/// DTO для завантаження вкладення в коментар.
/// </summary>
/// <param name="FileName">Назва файлу.</param>
/// <param name="ContentType">MIME-тип файлу.</param>
/// <param name="Base64Content">Файл у форматі base64.</param>
public sealed record AttachmentUploadRequest(
    string FileName,
    string ContentType,
    string Base64Content);
