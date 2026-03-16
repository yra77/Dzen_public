using Comments.Application.Common.Behaviors;
using Comments.Application.Features.Comments.Queries.GetCommentsPage;
using Comments.Application.Features.Comments.Queries.SearchComments;
using FluentValidation;
using MediatR;
using Xunit;

namespace Comments.Application.Tests;

public sealed class ValidationBehaviorTests
{
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
}
