using System.Collections.Generic;
using HotChocolate;

namespace Comments.Api.GraphQL;

/// <summary>
/// Нормалізує бізнес-помилки доменного рівня у стабільний GraphQL error contract.
/// </summary>
public sealed class BusinessRuleExceptionErrorFilter : IErrorFilter
{
    /// <summary>
    /// Трансформує <see cref="InvalidOperationException"/> у відповідь з кодом
    /// <c>BAD_USER_INPUT</c> і структурованим payload у <c>extensions.businessError</c>.
    /// </summary>
    /// <param name="error">Початковий GraphQL error.</param>
    /// <returns>Оригінальна або трансформована помилка.</returns>
    public IError OnError(IError error)
    {
        if (error.Exception is not InvalidOperationException invalidOperationException)
        {
            return error;
        }

        var businessError = new Dictionary<string, string>
        {
            ["type"] = "business_rule",
            ["message"] = invalidOperationException.Message
        };

        return error
            .WithMessage(invalidOperationException.Message)
            .WithCode("BAD_USER_INPUT")
            .SetExtension("businessError", businessError);
    }
}
