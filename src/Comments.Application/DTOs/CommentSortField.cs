namespace Comments.Application.DTOs;

/// <summary>
/// Поле сортування для вибірки кореневих коментарів.
/// </summary>
public enum CommentSortField
{
    /// <summary>
    /// Сортування за датою створення (UTC).
    /// </summary>
    CreatedAtUtc = 0,

    /// <summary>
    /// Сортування за ім'ям автора.
    /// </summary>
    UserName = 1,

    /// <summary>
    /// Сортування за email автора.
    /// </summary>
    Email = 2
}
