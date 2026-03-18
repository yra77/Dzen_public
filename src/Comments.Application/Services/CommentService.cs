using Comments.Application.Abstractions;
using Comments.Application.DTOs;
using Comments.Domain.Entities;

namespace Comments.Application.Services;

/// <summary>
/// Application service that encapsulates comment business workflows and mapping.
/// </summary>
public sealed class CommentService
{
    private readonly ICommentRepository _repository;
    private readonly ITextSanitizer _textSanitizer;
    private readonly ICommentCreatedPublisher _commentCreatedPublisher;
    private readonly IAttachmentStorage _attachmentStorage;

    /// <summary>
    /// Ініціалізує сервіс коментарів і його залежності інфраструктурного рівня.
    /// </summary>
    /// <param name="repository">Репозиторій для читання/запису коментарів.</param>
    /// <param name="textSanitizer">Санітизатор користувацького тексту.</param>
    /// <param name="commentCreatedPublisher">Паблішер події створення коментаря.</param>
    /// <param name="attachmentStorage">Сховище вкладень.</param>
    public CommentService(
        ICommentRepository repository,
        ITextSanitizer textSanitizer,
        ICommentCreatedPublisher commentCreatedPublisher,
        IAttachmentStorage attachmentStorage)
    {
        _repository = repository;
        _textSanitizer = textSanitizer;
        _commentCreatedPublisher = commentCreatedPublisher;
        _attachmentStorage = attachmentStorage;
    }

    /// <summary>
    /// Creates a new root or reply comment after validation and sanitization.
    /// </summary>
    public async Task<CommentDto> CreateAsync(CreateCommentRequest request, CancellationToken cancellationToken)
    {
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

    /// <summary>
    /// Returns a paged list of root comments with sorting and optional filter.
    /// </summary>
    public async Task<PagedResult<CommentDto>> GetPageAsync(
        int page,
        int pageSize,
        CommentSortField sortField,
        CommentSortDirection sortDirection,
        string? filter,
        CancellationToken cancellationToken)
    {
        var (comments, totalCount) = await _repository.GetRootCommentsAsync(
            page,
            pageSize,
            sortField,
            sortDirection,
            filter,
            cancellationToken);

        return new PagedResult<CommentDto>(
            page,
            pageSize,
            totalCount,
            comments.Select(x => Map(x, RepliesSortField, RepliesSortDirection)).ToArray());
    }

    /// <summary>
    /// Returns a root comment with replies sorted by creation date (oldest first).
    /// </summary>
    /// <remarks>
    /// <paramref name="sortField"/> and <paramref name="sortDirection"/> are kept for API backward compatibility
    /// but are not used because business rule allows sorting only for root comments list.
    /// </remarks>
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

        return Map(rootComment, RepliesSortField, RepliesSortDirection);
    }

    /// <summary>
    /// Поле сортування відповідей: для дочірніх коментарів завжди використовується дата.
    /// </summary>
    private const CommentSortField RepliesSortField = CommentSortField.CreatedAtUtc;

    /// <summary>
    /// Напрям сортування відповідей: у межах гілки відповіді йдуть від старих до нових.
    /// </summary>
    private const CommentSortDirection RepliesSortDirection = CommentSortDirection.Asc;

    /// <summary>
    /// Produces sanitized preview HTML for provided plain text/markup input.
    /// </summary>
    public string Preview(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return string.Empty;
        }

        return _textSanitizer.Sanitize(text);
    }

    /// <summary>
    /// Мапить доменну модель у DTO з рекурсивним сортуванням дочірніх відповідей.
    /// </summary>
    /// <param name="comment">Доменна сутність коментаря.</param>
    /// <param name="sortField">Поле сортування дочірніх елементів.</param>
    /// <param name="sortDirection">Напрям сортування дочірніх елементів.</param>
    /// <returns>DTO коментаря з повним деревом відповідей.</returns>
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

    /// <summary>
    /// Сортує колекцію коментарів відповідно до параметрів запиту.
    /// </summary>
    /// <param name="comments">Набір коментарів для сортування.</param>
    /// <param name="sortField">Поле сортування.</param>
    /// <param name="sortDirection">Напрям сортування.</param>
    /// <returns>Відсортована послідовність коментарів.</returns>
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
