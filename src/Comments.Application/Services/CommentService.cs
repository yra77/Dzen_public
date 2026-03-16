using Comments.Application.Abstractions;
using Comments.Application.DTOs;
using Comments.Domain.Entities;
using System.Net.Mail;
using System.Text.RegularExpressions;

namespace Comments.Application.Services;

public sealed class CommentService
{
    private static readonly Regex UserNameRegex = new("^[a-zA-Z0-9]+$", RegexOptions.Compiled);
    private const int MaxThreadDepth = 10;

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

            var parentDepth = await GetDepthAsync(parent, cancellationToken);
            if (parentDepth >= MaxThreadDepth)
            {
                throw new ArgumentException($"Max comment thread depth ({MaxThreadDepth}) exceeded.");
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
            comments.Select(x => Map(x, sortField, sortDirection)).ToArray());
    }

    private async Task ValidateAsync(CreateCommentRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.UserName)) throw new ArgumentException("User name is required.");
        if (string.IsNullOrWhiteSpace(request.Email)) throw new ArgumentException("Email is required.");
        if (string.IsNullOrWhiteSpace(request.Text)) throw new ArgumentException("Text is required.");

        if (!UserNameRegex.IsMatch(request.UserName.Trim()))
        {
            throw new ArgumentException("User name must contain only latin letters and digits.");
        }

        if (!MailAddress.TryCreate(request.Email.Trim(), out _))
        {
            throw new ArgumentException("Email format is invalid.");
        }

        if (!string.IsNullOrWhiteSpace(request.HomePage)
            && (!Uri.TryCreate(request.HomePage.Trim(), UriKind.Absolute, out var homePageUri)
                || (homePageUri.Scheme != Uri.UriSchemeHttp && homePageUri.Scheme != Uri.UriSchemeHttps)))
        {
            throw new ArgumentException("Home page must be a valid absolute URL with http/https scheme.");
        }

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

    private async Task<int> GetDepthAsync(Comment comment, CancellationToken cancellationToken)
    {
        var depth = 1;
        var visited = new HashSet<Guid> { comment.Id };
        var current = comment;

        while (current.ParentId is not null)
        {
            var parent = await _repository.FindByIdAsync(current.ParentId.Value, cancellationToken);
            if (parent is null)
            {
                break;
            }

            if (!visited.Add(parent.Id))
            {
                throw new InvalidOperationException("Comment hierarchy contains a cycle.");
            }

            depth++;
            current = parent;
        }

        return depth;
    }
}
