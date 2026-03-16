using FluentValidation;
using System.Text.RegularExpressions;

namespace Comments.Application.Features.Comments.Commands.CreateComment;

public sealed class CreateCommentCommandValidator : AbstractValidator<CreateCommentCommand>
{
    private static readonly Regex UserNameRegex = new("^[a-zA-Z0-9]+$", RegexOptions.Compiled);

    public CreateCommentCommandValidator()
    {
        RuleFor(x => x.Request.UserName)
            .NotEmpty()
            .MaximumLength(100)
            .Must(name => UserNameRegex.IsMatch(name.Trim()))
            .WithMessage("User name must contain only latin letters and digits.");

        RuleFor(x => x.Request.Email)
            .NotEmpty()
            .MaximumLength(200)
            .EmailAddress();

        RuleFor(x => x.Request.HomePage)
            .MaximumLength(2048)
            .Must(BeValidHomePageUrl)
            .When(x => !string.IsNullOrWhiteSpace(x.Request.HomePage))
            .WithMessage("Home page must be a valid absolute URL with http/https scheme.");

        RuleFor(x => x.Request.Text)
            .NotEmpty()
            .MaximumLength(5000);
    }

    private static bool BeValidHomePageUrl(string? homePage)
    {
        if (string.IsNullOrWhiteSpace(homePage))
        {
            return true;
        }

        return Uri.TryCreate(homePage.Trim(), UriKind.Absolute, out var uri)
               && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }
}
