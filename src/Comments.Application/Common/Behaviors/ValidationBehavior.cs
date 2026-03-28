

using FluentValidation;
using MediatR;


namespace Comments.Application.Common.Behaviors;
/// <summary>
/// MediatR pipeline-behavior, що централізовано запускає FluentValidation для кожного запиту.
/// </summary>
/// <typeparam name="TRequest">Тип CQRS-запиту, що обробляється в пайплайні.</typeparam>
/// <typeparam name="TResponse">Тип відповіді відповідного handler-а.</typeparam>
public sealed class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{


    private readonly IEnumerable<IValidator<TRequest>> _validators;


    /// <summary>
    /// Ініціалізує behavior колекцією валідаторів для конкретного типу запиту.
    /// </summary>
    /// <param name="validators">FluentValidation-валідатори, зареєстровані у DI.</param>
    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
    {
        _validators = validators;
    }


    /// <summary>
    /// Валідовує запит перед виконанням наступного елемента пайплайну/handler-а.
    /// </summary>
    /// <param name="request">Поточний запит MediatR.</param>
    /// <param name="next">Делегат виклику наступного обробника.</param>
    /// <param name="cancellationToken">Токен скасування асинхронної операції.</param>
    /// <returns>Результат виконання handler-а, якщо валідація успішна.</returns>
    /// <exception cref="ValidationException">Кидається, якщо знайдено хоча б одну validation-помилку.</exception>
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        // Гарантуємо єдину поведінку пайплайна: скасований токен зупиняє обробку
        // до запуску будь-яких валідаторів або handler-а.
        cancellationToken.ThrowIfCancellationRequested();

        if (!_validators.Any())
        {
            return await next();
        }

        var context = new ValidationContext<TRequest>(request);
        var validationResults = await Task.WhenAll(_validators.Select(v => v.ValidateAsync(context, cancellationToken)));
        var failures = validationResults
            .SelectMany(result => result.Errors)
            .Where(error => error is not null)
            .ToArray();

        if (failures.Length != 0)
        {
            throw new ValidationException(failures);
        }

        return await next();
    }
}