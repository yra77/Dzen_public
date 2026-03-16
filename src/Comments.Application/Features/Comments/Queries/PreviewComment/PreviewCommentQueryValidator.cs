using FluentValidation;

namespace Comments.Application.Features.Comments.Queries.PreviewComment;

public sealed class PreviewCommentQueryValidator : AbstractValidator<PreviewCommentQuery>
{
    public PreviewCommentQueryValidator()
    {
        RuleFor(x => x.Text)
            .MaximumLength(5000);
    }
}
