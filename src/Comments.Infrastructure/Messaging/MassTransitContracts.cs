using Comments.Application.DTOs;

namespace Comments.Infrastructure.Messaging;

/// <summary>
/// Контракт повідомлення для задачі індексації коментаря в пошуковому індексі.
/// </summary>
/// <param name="Comment">DTO коментаря, який потрібно проіндексувати.</param>
public sealed record CommentIndexingRequested(CommentDto Comment);

/// <summary>
/// Контракт повідомлення для задачі обробки вкладення коментаря.
/// </summary>
/// <param name="Comment">DTO коментаря з вкладенням для пост-обробки.</param>
public sealed record CommentFileProcessingRequested(CommentDto Comment);
