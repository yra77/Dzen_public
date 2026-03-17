namespace Comments.Domain.Entities;

/// <summary>
/// Доменна сутність коментаря, що підтримує ієрархію відповідей та metadata вкладення.
/// </summary>
public sealed class Comment
{
    private readonly List<Comment> _replies = new();

    private Comment()
    {
    }

    /// <summary>
    /// Ініціалізує новий екземпляр коментаря.
    /// </summary>
    public Comment(
        Guid id,
        Guid? parentId,
        string userName,
        string email,
        string? homePage,
        string text,
        DateTime createdAtUtc,
        string? attachmentFileName,
        string? attachmentContentType,
        string? attachmentStoragePath,
        long? attachmentSizeBytes)
    {
        Id = id;
        ParentId = parentId;
        UserName = userName;
        Email = email;
        HomePage = homePage;
        Text = text;
        CreatedAtUtc = createdAtUtc;
        AttachmentFileName = attachmentFileName;
        AttachmentContentType = attachmentContentType;
        AttachmentStoragePath = attachmentStoragePath;
        AttachmentSizeBytes = attachmentSizeBytes;
    }

    /// <summary>
    /// Унікальний ідентифікатор коментаря.
    /// </summary>
    public Guid Id { get; private set; }

    /// <summary>
    /// Ідентифікатор батьківського коментаря (null для root).
    /// </summary>
    public Guid? ParentId { get; private set; }

    /// <summary>
    /// Ім'я автора.
    /// </summary>
    public string UserName { get; private set; } = string.Empty;

    /// <summary>
    /// Email автора.
    /// </summary>
    public string Email { get; private set; } = string.Empty;

    /// <summary>
    /// Опціональна домашня сторінка автора.
    /// </summary>
    public string? HomePage { get; private set; }

    /// <summary>
    /// Санітизований текст коментаря.
    /// </summary>
    public string Text { get; private set; } = string.Empty;

    /// <summary>
    /// Дата створення в UTC.
    /// </summary>
    public DateTime CreatedAtUtc { get; private set; }

    /// <summary>
    /// Назва прикріпленого файлу.
    /// </summary>
    public string? AttachmentFileName { get; private set; }

    /// <summary>
    /// MIME-тип прикріпленого файлу.
    /// </summary>
    public string? AttachmentContentType { get; private set; }

    /// <summary>
    /// Внутрішній шлях збереження вкладення.
    /// </summary>
    public string? AttachmentStoragePath { get; private set; }

    /// <summary>
    /// Розмір вкладення у байтах.
    /// </summary>
    public long? AttachmentSizeBytes { get; private set; }

    /// <summary>
    /// Навігаційна властивість до батьківського коментаря.
    /// </summary>
    public Comment? Parent { get; private set; }

    /// <summary>
    /// Колекція дочірніх відповідей (read-only проекція).
    /// </summary>
    public IReadOnlyCollection<Comment> Replies => _replies.AsReadOnly();

    /// <summary>
    /// Додає дочірню відповідь до поточного коментаря.
    /// </summary>
    public void AddReply(Comment reply)
    {
        if (reply.ParentId != Id)
        {
            throw new InvalidOperationException("Reply must point to current comment.");
        }

        _replies.Add(reply);
    }

    /// <summary>
    /// Оновлює текст коментаря після санітизації.
    /// </summary>
    public void UpdateText(string sanitizedText)
    {
        Text = sanitizedText;
    }
}
