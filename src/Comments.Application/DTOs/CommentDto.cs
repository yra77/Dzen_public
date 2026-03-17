namespace Comments.Application.DTOs;

/// <summary>
/// DTO коментаря з вкладенням і дочірніми відповідями.
/// </summary>
/// <param name="Id">Ідентифікатор коментаря.</param>
/// <param name="ParentId">Ідентифікатор батьківського коментаря.</param>
/// <param name="UserName">Ім'я автора.</param>
/// <param name="Email">Email автора.</param>
/// <param name="HomePage">Опціональна домашня сторінка автора.</param>
/// <param name="Text">Санітизований текст коментаря.</param>
/// <param name="CreatedAtUtc">Мітка часу створення у UTC.</param>
/// <param name="Attachment">Опціональне вкладення.</param>
/// <param name="Replies">Колекція дочірніх коментарів.</param>
public sealed record CommentDto(
    Guid Id,
    Guid? ParentId,
    string UserName,
    string Email,
    string? HomePage,
    string Text,
    DateTime CreatedAtUtc,
    AttachmentDto? Attachment,
    IReadOnlyCollection<CommentDto> Replies);

/// <summary>
/// DTO вкладення коментаря.
/// </summary>
/// <param name="FileName">Назва файлу вкладення.</param>
/// <param name="ContentType">MIME-тип вкладення.</param>
/// <param name="StoragePath">Внутрішній шлях збереження файлу.</param>
/// <param name="SizeBytes">Розмір файлу в байтах.</param>
public sealed record AttachmentDto(
    string FileName,
    string ContentType,
    string StoragePath,
    long SizeBytes);
