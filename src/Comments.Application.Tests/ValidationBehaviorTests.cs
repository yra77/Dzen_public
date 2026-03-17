using Comments.Application.Common.Behaviors;
using Comments.Application.Features.Comments.Queries.GetCommentsPage;
using Comments.Application.Features.Comments.Queries.SearchComments;
using FluentValidation;
using MediatR;
using Xunit;

namespace Comments.Application.Tests;

/// <summary>
/// Перевірки MediatR validation-pipeline для CQRS-запитів.
/// </summary>
public sealed class ValidationBehaviorTests
{
    /// <summary>
    /// Гарантує, що для валідного запиту pipeline передає керування в handler.
    /// </summary>
    [Fact]
    public async Task Handle_WithValidRequest_CallsNext()
    {
        var behavior = new ValidationBehavior<GetCommentsPageQuery, string>(
            new IValidator<GetCommentsPageQuery>[] { new GetCommentsPageQueryValidator() });

        var nextCalled = false;
        var response = await behavior.Handle(
            new GetCommentsPageQuery(1, 25, Application.DTOs.CommentSortField.CreatedAtUtc, Application.DTOs.CommentSortDirection.Desc),
            () =>
            {
                nextCalled = true;
                return Task.FromResult("ok");
            },
            CancellationToken.None);

        Assert.True(nextCalled);
        Assert.Equal("ok", response);
    }

    /// <summary>
    /// Перевіряє, що некоректний запит завершується ValidationException.
    /// </summary>
    [Fact]
    public async Task Handle_WithInvalidRequest_ThrowsValidationException()
    {
        var behavior = new ValidationBehavior<SearchCommentsQuery, Unit>(
            new IValidator<SearchCommentsQuery>[] { new SearchCommentsQueryValidator() });

        await Assert.ThrowsAsync<ValidationException>(() => behavior.Handle(
            new SearchCommentsQuery(string.Empty, 0, 1000),
            () => Task.FromResult(Unit.Value),
            CancellationToken.None));
    }

    /// <summary>
    /// Підтверджує, що за відсутності валідаторів behavior не блокує виконання handler.
    /// </summary>
    [Fact]
    public async Task Handle_WithNoValidators_CallsNext()
    {
        var behavior = new ValidationBehavior<GetCommentsPageQuery, string>(Array.Empty<IValidator<GetCommentsPageQuery>>());

        var nextCalled = false;
        var response = await behavior.Handle(
            new GetCommentsPageQuery(1, 25, Application.DTOs.CommentSortField.CreatedAtUtc, Application.DTOs.CommentSortDirection.Desc),
            () =>
            {
                nextCalled = true;
                return Task.FromResult("ok");
            },
            CancellationToken.None);

        Assert.True(nextCalled);
        Assert.Equal("ok", response);
    }

    /// <summary>
    /// Перевіряє, що pipeline агрегує помилки з кількох валідаторів в одному exception.
    /// </summary>
    [Fact]
    public async Task Handle_WithMultipleInvalidValidators_AggregatesFailures()
    {
        var behavior = new ValidationBehavior<GetCommentsPageQuery, Unit>(
            new IValidator<GetCommentsPageQuery>[]
            {
                new AlwaysFailGetCommentsPageQueryValidator("Page"),
                new AlwaysFailGetCommentsPageQueryValidator("PageSize")
            });

        var exception = await Assert.ThrowsAsync<ValidationException>(() => behavior.Handle(
            new GetCommentsPageQuery(1, 25, Application.DTOs.CommentSortField.CreatedAtUtc, Application.DTOs.CommentSortDirection.Desc),
            () => Task.FromResult(Unit.Value),
            CancellationToken.None));

        Assert.Collection(
            exception.Errors.OrderBy(error => error.PropertyName),
            first => Assert.Equal("Page", first.PropertyName),
            second => Assert.Equal("PageSize", second.PropertyName));
    }

    /// <summary>
    /// Перевіряє, що при скасуванні токена валідація переривається, а handler не викликається.
    /// </summary>
    [Fact]
    public async Task Handle_WithCanceledToken_ThrowsOperationCanceledExceptionAndDoesNotCallNext()
    {
        var behavior = new ValidationBehavior<GetCommentsPageQuery, string>(
            new IValidator<GetCommentsPageQuery>[] { new GetCommentsPageQueryValidator() });

        using var cancellationTokenSource = new CancellationTokenSource();
        cancellationTokenSource.Cancel();

        var nextCalled = false;

        await Assert.ThrowsAsync<OperationCanceledException>(() => behavior.Handle(
            new GetCommentsPageQuery(1, 25, Application.DTOs.CommentSortField.CreatedAtUtc, Application.DTOs.CommentSortDirection.Desc),
            () =>
            {
                nextCalled = true;
                return Task.FromResult("ok");
            },
            cancellationTokenSource.Token));

        Assert.False(nextCalled);
    }

    /// <summary>
    /// Тестовий валідатор, що завжди повертає одну помилку для заданого поля.
    /// </summary>
    private sealed class AlwaysFailGetCommentsPageQueryValidator : AbstractValidator<GetCommentsPageQuery>
    {
        /// <summary>
        /// Налаштовує правило, яке гарантовано повертає помилку для перевірюваної властивості.
        /// </summary>
        /// <param name="propertyName">Назва властивості, яку треба позначити як некоректну.</param>
        public AlwaysFailGetCommentsPageQueryValidator(string propertyName)
        {
            RuleFor(_ => _.Page)
                .Must(_ => false)
                .WithMessage($"{propertyName} failed")
                .OverridePropertyName(propertyName);
        }
    }
}
