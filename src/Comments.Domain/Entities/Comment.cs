namespace Comments.Domain.Entities;

public sealed class Comment
{
    private readonly List<Comment> _replies = new();

    public Guid Id { get; }
    public Guid? ParentId { get; }
    public string UserName { get; }
    public string Email { get; }
    public string? HomePage { get; }
    public string Text { get; private set; }
    public DateTime CreatedAtUtc { get; }
    public IReadOnlyCollection<Comment> Replies => _replies.AsReadOnly();

    public Comment(
        Guid id,
        Guid? parentId,
        string userName,
        string email,
        string? homePage,
        string text,
        DateTime createdAtUtc)
    {
        Id = id;
        ParentId = parentId;
        UserName = userName;
        Email = email;
        HomePage = homePage;
        Text = text;
        CreatedAtUtc = createdAtUtc;
    }

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
