namespace Comments.Api.GraphQL;

/// <summary>
/// GraphQL input-модель створення коментаря або reply.
/// </summary>
/// <param name="ParentId">ID батьківського коментаря; null для root-коментаря.</param>
/// <param name="UserName">Ім'я автора.</param>
/// <param name="Email">Email автора.</param>
/// <param name="HomePage">Опціональна домашня сторінка автора.</param>
/// <param name="Text">Текст коментаря.</param>
/// <param name="CaptchaToken">CAPTCHA токен у форматі challengeId:answer.</param>
/// <param name="Attachment">Опціональне вкладення.</param>
public sealed record CreateCommentInput(
    Guid? ParentId,
    string UserName,
    string Email,
    string? HomePage,
    string Text,
    string? CaptchaToken,
    AttachmentInput? Attachment);

/// <summary>
/// GraphQL input-модель явного додавання відповіді до існуючого коментаря.
/// </summary>
/// <param name="ParentId">ID батьківського коментаря для reply.</param>
/// <param name="UserName">Ім'я автора.</param>
/// <param name="Email">Email автора.</param>
/// <param name="HomePage">Опціональна домашня сторінка автора.</param>
/// <param name="Text">Текст відповіді.</param>
/// <param name="CaptchaToken">CAPTCHA токен у форматі challengeId:answer.</param>
/// <param name="Attachment">Опціональне вкладення.</param>
public sealed record AddReplyInput(
    Guid ParentId,
    string UserName,
    string Email,
    string? HomePage,
    string Text,
    string? CaptchaToken,
    AttachmentInput? Attachment);

/// <summary>
/// GraphQL input-модель вкладення для створення коментаря.
/// </summary>
/// <param name="FileName">Оригінальна назва файлу.</param>
/// <param name="ContentType">MIME-тип файлу.</param>
/// <param name="Base64Content">Вміст файлу у форматі base64 (без data URL-префікса).</param>
public sealed record AttachmentInput(
    string FileName,
    string ContentType,
    string Base64Content);
