using FluentValidation;
using Microsoft.AspNetCore.Mvc;

namespace Comments.Infrastructure.Http;

/// <summary>
/// Перетворює <see cref="ValidationException"/> у стандартизований HTTP 400 response.
/// </summary>
public sealed class ValidationExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;

    /// <summary>
    /// Ініціалізує middleware з наступним компонентом HTTP-конвеєра.
    /// </summary>
    public ValidationExceptionHandlingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    /// <summary>
    /// Обробляє HTTP-запит і повертає JSON-помилку при FluentValidation винятках.
    /// </summary>
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ValidationException validationException)
        {
            var errors = validationException.Errors
                .GroupBy(x => x.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(x => x.ErrorMessage).ToArray());

            var details = new ValidationProblemDetails(errors)
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Validation failed"
            };

            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(details);
        }
    }
}
