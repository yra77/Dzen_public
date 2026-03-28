namespace Comments.Infrastructure.Search;

/// <summary>
/// Typed-документ Elasticsearch для індексації та пошуку коментарів.
/// </summary>
public sealed class CommentSearchDocument
{
    /// <summary>
    /// Ідентифікатор коментаря.
    /// </summary>
    public Guid Id { get; init; }

    /// <summary>
    /// Ідентифікатор батьківського коментаря, якщо це відповідь.
    /// </summary>
    public Guid? ParentId { get; init; }

    /// <summary>
    /// Ім'я автора коментаря.
    /// </summary>
    public string UserName { get; init; } = string.Empty;

    /// <summary>
    /// Email автора коментаря.
    /// </summary>
    public string Email { get; init; } = string.Empty;

    /// <summary>
    /// Домашня сторінка автора (опціонально).
    /// </summary>
    public string? HomePage { get; init; }

    /// <summary>
    /// Санітизований текст коментаря.
    /// </summary>
    public string Text { get; init; } = string.Empty;

    /// <summary>
    /// UTC-час створення коментаря.
    /// </summary>
    public DateTime CreatedAtUtc { get; init; }
}