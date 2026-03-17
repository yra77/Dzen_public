using FluentValidation;

namespace Comments.Application.Features.Comments.Queries.GetCommentThread;

/// <summary>
/// Валідатор запиту на завантаження дерева коментарів за root-ідентифікатором.
/// </summary>
public sealed class GetCommentThreadQueryValidator : AbstractValidator<GetCommentThreadQuery>
{
    /// <summary>
    /// Описує обов'язкові правила для <see cref="GetCommentThreadQuery"/>.
    /// </summary>
    public GetCommentThreadQueryValidator()
    {
        RuleFor(x => x.RootCommentId).NotEmpty();
    }
}
