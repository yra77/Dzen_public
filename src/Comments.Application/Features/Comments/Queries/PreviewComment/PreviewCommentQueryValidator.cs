using FluentValidation;

namespace Comments.Application.Features.Comments.Queries.PreviewComment;

/// <summary>
/// Валідатор CQRS-запиту preview тексту коментаря.
/// </summary>
public sealed class PreviewCommentQueryValidator : AbstractValidator<PreviewCommentQuery>
{
    /// <summary>
    /// Налаштовує правила валідації для <see cref="PreviewCommentQuery"/>.
    /// </summary>
    public PreviewCommentQueryValidator()
    {
        RuleFor(x => x.Text)
            .MaximumLength(5000);
    }
}
