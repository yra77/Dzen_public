namespace Comments.Domain.Entities;

public sealed class Comment
{
    private readonly List<Comment> _replies = new();

    private Comment()
    {
    }

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

    public Guid Id { get; private set; }
    public Guid? ParentId { get; private set; }
    public string UserName { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string? HomePage { get; private set; }
    public string Text { get; private set; } = string.Empty;
    public DateTime CreatedAtUtc { get; private set; }
    public string? AttachmentFileName { get; private set; }
    public string? AttachmentContentType { get; private set; }
    public string? AttachmentStoragePath { get; private set; }
    public long? AttachmentSizeBytes { get; private set; }

    public Comment? Parent { get; private set; }
    public IReadOnlyCollection<Comment> Replies => _replies.AsReadOnly();

    public void AddReply(Comment reply)
    {
        if (reply.ParentId != Id)
        {
            throw new InvalidOperationException("Reply must point to current comment.");
        }

        _replies.Add(reply);
    }

    public void UpdateText(string sanitizedText)
    {
        Text = sanitizedText;
    }
}
