using FluentValidation;

namespace Comments.Application.Features.Comments.Queries.SearchComments;

public sealed class SearchCommentsQueryValidator : AbstractValidator<SearchCommentsQuery>
{
    public SearchCommentsQueryValidator()
    {
        RuleFor(x => x.Query)
            .NotEmpty();

        RuleFor(x => x.Page)
            .GreaterThan(0);

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100);
    }
}
