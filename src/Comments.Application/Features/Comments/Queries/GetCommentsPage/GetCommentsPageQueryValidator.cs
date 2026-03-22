// File overview: FluentValidation validator for root comment page query constraints.
using FluentValidation;

namespace Comments.Application.Features.Comments.Queries.GetCommentsPage;

/// <summary>
/// Validates paging and filter constraints for root comments query.
/// </summary>
public sealed class GetCommentsPageQueryValidator : AbstractValidator<GetCommentsPageQuery>
{
    /// <summary>
    /// Configures validation rules for page number, page size and optional filter value.
    /// </summary>
    public GetCommentsPageQueryValidator()
    {
        RuleFor(x => x.Page).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
        RuleFor(x => x.Filter).MaximumLength(200);
    }
}
