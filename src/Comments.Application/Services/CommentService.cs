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

        var createdComment = Map(comment);
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

    private async Task ValidateAsync(CreateCommentRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.UserName)) throw new ArgumentException("User name is required.");
        if (string.IsNullOrWhiteSpace(request.Email)) throw new ArgumentException("Email is required.");
        if (string.IsNullOrWhiteSpace(request.Text)) throw new ArgumentException("Text is required.");

        var captchaIsValid = await _captchaValidator.ValidateAsync(request.CaptchaToken, cancellationToken);
        if (!captchaIsValid)
        {
            throw new ArgumentException("Captcha validation failed.");
        }
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
            comment.AttachmentStoragePath is null
                ? null
                : new AttachmentDto(
                    comment.AttachmentFileName!,
                    comment.AttachmentContentType!,
                    comment.AttachmentStoragePath,
                    comment.AttachmentSizeBytes ?? 0),
            replies);
    }
}
