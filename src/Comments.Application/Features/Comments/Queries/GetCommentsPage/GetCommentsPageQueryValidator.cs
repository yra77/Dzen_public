using FluentValidation;

namespace Comments.Application.Features.Comments.Queries.GetCommentsPage;

public sealed class GetCommentsPageQueryValidator : AbstractValidator<GetCommentsPageQuery>
{
    public GetCommentsPageQueryValidator()
    {
        RuleFor(x => x.Page).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
    }
}
