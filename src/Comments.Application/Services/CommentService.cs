using Comments.Application.Abstractions;
using Comments.Application.DTOs;
using Comments.Domain.Entities;

namespace Comments.Application.Services;

public sealed class CommentService
{
    private readonly ICommentRepository _repository;
    private readonly ITextSanitizer _textSanitizer;

    public CommentService(ICommentRepository repository, ITextSanitizer textSanitizer)
    {
        _repository = repository;
        _textSanitizer = textSanitizer;
    }

    public async Task<CommentDto> CreateAsync(CreateCommentRequest request, CancellationToken cancellationToken)
    {
        Validate(request);

        var sanitizedText = _textSanitizer.Sanitize(request.Text);
        var comment = new Comment(
            Guid.NewGuid(),
            request.ParentId,
            request.UserName.Trim(),
            request.Email.Trim(),
            request.HomePage?.Trim(),
            sanitizedText,
            DateTime.UtcNow);

        if (request.ParentId is not null)
        {
            var parent = await _repository.FindByIdAsync(request.ParentId.Value, cancellationToken);
            if (parent is null)
            {
                throw new InvalidOperationException("Parent comment was not found.");
            }

            parent.AddReply(comment);
        }

        await _repository.AddAsync(comment, cancellationToken);
        return Map(comment);
    }

    public async Task<PagedResult<CommentDto>> GetPageAsync(
        int page,
        int pageSize,
        CommentSortField sortField,
        CommentSortDirection sortDirection,
        CancellationToken cancellationToken)
    {
        if (page <= 0) throw new ArgumentOutOfRangeException(nameof(page));
        if (pageSize <= 0) throw new ArgumentOutOfRangeException(nameof(pageSize));

        var (comments, totalCount) = await _repository.GetRootCommentsAsync(
            page,
            pageSize,
            sortField,
            sortDirection,
            cancellationToken);

        return new PagedResult<CommentDto>(
            page,
            pageSize,
            totalCount,
            comments.Select(Map).ToArray());
    }

    private static void Validate(CreateCommentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserName)) throw new ArgumentException("User name is required.");
        if (string.IsNullOrWhiteSpace(request.Email)) throw new ArgumentException("Email is required.");
        if (string.IsNullOrWhiteSpace(request.Text)) throw new ArgumentException("Text is required.");
    }

    private static CommentDto Map(Comment comment)
    {
        var replies = comment.Replies.Select(Map).ToArray();

        return new CommentDto(
            comment.Id,
            comment.ParentId,
            comment.UserName,
            comment.Email,
            comment.HomePage,
            comment.Text,
            comment.CreatedAtUtc,
            replies);
    }
}
