

using FluentValidation;


namespace Comments.Application.Features.Comments.Queries.SearchComments;
/// <summary>
/// Валідатор параметрів пошуку коментарів у read-моделі.
/// </summary>
public sealed class SearchCommentsQueryValidator : AbstractValidator<SearchCommentsQuery>
{
    /// <summary>
    /// Описує правила валідації для пошукового запиту.
    /// </summary>
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