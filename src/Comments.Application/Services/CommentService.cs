using Comments.Application.Abstractions;
using Comments.Application.DTOs;
using Comments.Domain.Entities;

namespace Comments.Application.Services;

public sealed class CommentService
{

    private readonly ICommentRepository _repository;
    private readonly ITextSanitizer _textSanitizer;
    private readonly ICommentCreatedPublisher _commentCreatedPublisher;
    private readonly ICaptchaValidator _captchaValidator;
    private readonly IAttachmentStorage _attachmentStorage;

    public CommentService(
        ICommentRepository repository,
        ITextSanitizer textSanitizer,
        ICommentCreatedPublisher commentCreatedPublisher,
        ICaptchaValidator captchaValidator,
        IAttachmentStorage attachmentStorage)
    {
        _repository = repository;
        _textSanitizer = textSanitizer;
        _commentCreatedPublisher = commentCreatedPublisher;
        _captchaValidator = captchaValidator;
        _attachmentStorage = attachmentStorage;
    }

    public async Task<CommentDto> CreateAsync(CreateCommentRequest request, CancellationToken cancellationToken)
    {
        await ValidateAsync(request, cancellationToken);

        StoredAttachment? storedAttachment = null;
        if (request.Attachment is not null)
        {
            storedAttachment = await _attachmentStorage.SaveAsync(request.Attachment, cancellationToken);
        }

        var sanitizedText = _textSanitizer.Sanitize(request.Text);
        var comment = new Comment(
            Guid.NewGuid(),
            request.ParentId,
            request.UserName.Trim(),
            request.Email.Trim(),
            request.HomePage?.Trim(),
            sanitizedText,
            DateTime.UtcNow,
            storedAttachment?.FileName,
            storedAttachment?.ContentType,
            storedAttachment?.StoragePath,
            storedAttachment?.SizeBytes);

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

        var createdComment = Map(comment, CommentSortField.CreatedAtUtc, CommentSortDirection.Desc);
        await _commentCreatedPublisher.PublishAsync(createdComment, cancellationToken);

        return createdComment;
    }

    public async Task<PagedResult<CommentDto>> GetPageAsync(
        int page,
        int pageSize,
        CommentSortField sortField,
        CommentSortDirection sortDirection,
        CancellationToken cancellationToken)
    {
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
            comments.Select(x => Map(x, sortField, sortDirection)).ToArray());
    }

    public async Task<CommentDto> GetThreadAsync(
        Guid rootCommentId,
        CommentSortField sortField,
        CommentSortDirection sortDirection,
        CancellationToken cancellationToken)
    {
        var rootComment = await _repository.FindByIdAsync(rootCommentId, cancellationToken);
        if (rootComment is null)
        {
            throw new InvalidOperationException("Comment was not found.");
        }

        return Map(rootComment, sortField, sortDirection);
    }

    public string Preview(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return string.Empty;
        }

        return _textSanitizer.Sanitize(text);
    }

    private async Task ValidateAsync(CreateCommentRequest request, CancellationToken cancellationToken)
    {
        var captchaIsValid = await _captchaValidator.ValidateAsync(request.CaptchaToken, cancellationToken);
        if (!captchaIsValid)
        {
            throw new ArgumentException("Captcha validation failed.");
        }
    }

    private static CommentDto Map(Comment comment, CommentSortField sortField, CommentSortDirection sortDirection)
    {
        var replies = Sort(comment.Replies, sortField, sortDirection)
            .Select(x => Map(x, sortField, sortDirection))
            .ToArray();

        return new CommentDto(
            comment.Id,
            comment.ParentId,
            comment.UserName,
            comment.Email,
            comment.HomePage,
            comment.Text,
            comment.CreatedAtUtc,
            comment.AttachmentStoragePath is null
                ? null
                : new AttachmentDto(
                    comment.AttachmentFileName!,
                    comment.AttachmentContentType!,
                    comment.AttachmentStoragePath,
                    comment.AttachmentSizeBytes ?? 0),
            replies);
    }

    private static IEnumerable<Comment> Sort(
        IEnumerable<Comment> comments,
        CommentSortField sortField,
        CommentSortDirection sortDirection)
    {
        return (sortField, sortDirection) switch
        {
            (CommentSortField.UserName, CommentSortDirection.Asc) => comments.OrderBy(x => x.UserName),
            (CommentSortField.UserName, CommentSortDirection.Desc) => comments.OrderByDescending(x => x.UserName),
            (CommentSortField.Email, CommentSortDirection.Asc) => comments.OrderBy(x => x.Email),
            (CommentSortField.Email, CommentSortDirection.Desc) => comments.OrderByDescending(x => x.Email),
            (CommentSortField.CreatedAtUtc, CommentSortDirection.Asc) => comments.OrderBy(x => x.CreatedAtUtc),
            _ => comments.OrderByDescending(x => x.CreatedAtUtc)
        };
    }

}
