using Comments.Application.DTOs;
using Comments.Application.Features.Comments.Queries.GetCommentsPage;
using Comments.Application.Features.Comments.Queries.GetCommentThread;
using Comments.Application.Features.Comments.Queries.PreviewComment;
using Comments.Application.Features.Comments.Queries.SearchComments;
using Comments.Api.Infrastructure;
using Comments.Infrastructure.Storage;
using Comments.Infrastructure.Captcha;
using MediatR;
using System.Text;

namespace Comments.Api.GraphQL;

/// <summary>
/// GraphQL query resolvers for listing, threading, searching and previewing comments.
/// </summary>
public sealed class CommentQueries
{
    /// <summary>
    /// Повертає сторінку root-коментарів із сортуванням та опціональним фільтром.
    /// </summary>
    public Task<PagedResult<CommentDto>> CommentsPage(
        [Service] IMediator mediator,
        int page = 1,
        int pageSize = 25,
        CommentSortField sortBy = CommentSortField.CreatedAtUtc,
        CommentSortDirection sortDirection = CommentSortDirection.Desc,
        string? filter = null,
        CancellationToken cancellationToken = default)
    {
        return mediator.Send(new GetCommentsPageQuery(page, pageSize, sortBy, sortDirection, filter), cancellationToken);
    }

    /// <summary>
    /// Backward-compatible alias для <see cref="CommentsPage"/>.
    /// </summary>
    public Task<PagedResult<CommentDto>> Comments(
        [Service] IMediator mediator,
        int page = 1,
        int pageSize = 25,
        CommentSortField sortBy = CommentSortField.CreatedAtUtc,
        CommentSortDirection sortDirection = CommentSortDirection.Desc,
        string? filter = null,
        CancellationToken cancellationToken = default)
    {
        return CommentsPage(mediator, page, pageSize, sortBy, sortDirection, filter, cancellationToken);
    }

    /// <summary>
    /// Повертає дерево гілки коментарів для вказаного root-коментаря.
    /// </summary>
    public Task<CommentDto> CommentTree(
        [Service] IMediator mediator,
        Guid rootCommentId,
        CommentSortField sortBy = CommentSortField.CreatedAtUtc,
        CommentSortDirection sortDirection = CommentSortDirection.Desc,
        CancellationToken cancellationToken = default)
    {
        return mediator.Send(new GetCommentThreadQuery(rootCommentId, sortBy, sortDirection), cancellationToken);
    }


    /// <summary>
    /// Backward-compatible alias для <see cref="CommentTree"/>.
    /// </summary>
    public Task<CommentDto> CommentThread(
        [Service] IMediator mediator,
        Guid rootCommentId,
        CommentSortField sortBy = CommentSortField.CreatedAtUtc,
        CommentSortDirection sortDirection = CommentSortDirection.Desc,
        CancellationToken cancellationToken = default)
    {
        return CommentTree(mediator, rootCommentId, sortBy, sortDirection, cancellationToken);
    }

    /// <summary>
    /// Виконує пошук коментарів через налаштований search-сервіс.
    /// </summary>
    public Task<PagedResult<CommentDto>> SearchComments(
        [Service] IMediator mediator,
        string query,
        int page = 1,
        int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        return mediator.Send(new SearchCommentsQuery(query, page, pageSize), cancellationToken);
    }

    /// <summary>
    /// Повертає санітизований HTML preview тексту коментаря.
    /// </summary>
    public async Task<string> PreviewComment(
        [Service] IMediator mediator,
        string text,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new PreviewCommentQuery(text), cancellationToken);
    }
    /// <summary>
    /// Повертає captcha-зображення для GraphQL SPA-клієнта.
    /// </summary>
    public CaptchaChallengeService.CaptchaImagePayload CaptchaImage(
        [Service] CaptchaChallengeService captchaChallengeService)
    {
        return captchaChallengeService.CreateImagePayload();
    }

    /// <summary>
    /// Повертає txt-preview вкладення за його storage path.
    /// </summary>
    public async Task<string> AttachmentTextPreview(
        [Service] LocalAttachmentStorageOptions attachmentOptions,
        string storagePath,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(storagePath))
        {
            throw new ArgumentException("storagePath is required.", nameof(storagePath));
        }

        var normalizedStoragePath = storagePath.Trim().Replace('\\', '/');
        if (normalizedStoragePath.StartsWith('/'))
        {
            normalizedStoragePath = normalizedStoragePath[1..];
        }

        if (!normalizedStoragePath.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Only uploads/* paths are supported.", nameof(storagePath));
        }

        if (!normalizedStoragePath.EndsWith(".txt", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Only .txt attachments are supported.", nameof(storagePath));
        }

        var attachmentsRoot = Path.GetFullPath(attachmentOptions.RootPath);
        var relativePath = normalizedStoragePath["uploads/".Length..];
        var targetPath = Path.GetFullPath(Path.Combine(attachmentsRoot, relativePath));

        if (!targetPath.StartsWith(attachmentsRoot, StringComparison.OrdinalIgnoreCase) || !File.Exists(targetPath))
        {
            throw new FileNotFoundException("Attachment file was not found.", normalizedStoragePath);
        }

        using var streamReader = new StreamReader(targetPath, Encoding.UTF8, true);
        return await streamReader.ReadToEndAsync(cancellationToken);
    }

}
