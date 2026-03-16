using FluentValidation;
using HotChocolate;

namespace Comments.Api.GraphQL;

public sealed class ValidationExceptionErrorFilter : IErrorFilter
{
    public IError OnError(IError error)
    {
        if (error.Exception is not ValidationException validationException)
        {
            return error;
        }

        var validationErrors = validationException.Errors
            .GroupBy(x => x.PropertyName)
            .ToDictionary(g => g.Key, g => g.Select(x => x.ErrorMessage).ToArray());

        return error
            .WithMessage("Validation failed")
            .WithCode("BAD_USER_INPUT")
            .SetExtension("validationErrors", validationErrors);
    }
}
