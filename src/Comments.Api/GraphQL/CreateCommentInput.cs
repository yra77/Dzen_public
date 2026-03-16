namespace Comments.Api.GraphQL;

public sealed record CreateCommentInput(
    Guid? ParentId,
    string UserName,
    string Email,
    string? HomePage,
    string Text,
    string? CaptchaToken);
