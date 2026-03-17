using FluentValidation;
using HotChocolate;

namespace Comments.Api.GraphQL;

/// <summary>
/// Maps <see cref="ValidationException"/> instances to GraphQL <c>BAD_USER_INPUT</c> errors
/// and appends normalized <c>validationErrors</c> extension payload.
/// </summary>
public sealed class ValidationExceptionErrorFilter : IErrorFilter
{
    /// <summary>
    /// Converts FluentValidation failures into GraphQL-friendly error shape.
    /// </summary>
    /// <param name="error">The original GraphQL error.</param>
    /// <returns>
    /// Original error when exception is not validation-related;
    /// otherwise transformed error with <c>code</c> and <c>validationErrors</c> extension.
    /// </returns>
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
