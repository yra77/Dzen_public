using FluentValidation;

namespace Comments.Application.Features.Comments.Queries.GetCommentThread;

public sealed class GetCommentThreadQueryValidator : AbstractValidator<GetCommentThreadQuery>
{
    public GetCommentThreadQueryValidator()
    {
        RuleFor(x => x.RootCommentId).NotEmpty();
    }
}
