using Comments.Application.DTOs;
using Comments.Application.Features.Comments.Commands.CreateComment;
using Comments.Application.Features.Comments.Queries.GetCommentsPage;
using Comments.Application.Features.Comments.Queries.GetCommentThread;
using Comments.Application.Features.Comments.Queries.PreviewComment;
using Comments.Application.Features.Comments.Queries.SearchComments;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Comments.Api.Controllers;

[ApiController]
[Route("api/comments")]
/// <summary>
/// REST endpoints for comment creation, listing, threading and preview operations.
/// </summary>
public sealed class CommentsController : ControllerBase
{
    /// <summary>
    /// Preview payload for comment text sanitization endpoint.
    /// </summary>
    /// <param name="Text">Вхідний текст, що має бути санітизований для preview.</param>
    public sealed record PreviewRequest(string Text);

    private readonly IMediator _mediator;

    /// <summary>
    /// Ініціалізує контролер коментарів.
    /// </summary>
    /// <param name="mediator">MediatR-шина для dispatch CQRS запитів і команд.</param>
    public CommentsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Створює новий root-коментар або reply-коментар.
    /// </summary>
    /// <param name="request">Тіло запиту створення коментаря.</param>
    /// <param name="cancellationToken">Токен скасування HTTP-запиту.</param>
    /// <returns>HTTP 201 зі створеним коментарем.</returns>
    [HttpPost]
    [ProducesResponseType(typeof(CommentDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateCommentRequest request, CancellationToken cancellationToken)
    {
        var created = await _mediator.Send(new CreateCommentCommand(request), cancellationToken);
        return CreatedAtAction(nameof(GetPage), new { page = 1, pageSize = 25 }, created);
    }

    /// <summary>
    /// Повертає сторінку root-коментарів із сортуванням та опційним фільтром.
    /// </summary>
    /// <param name="page">Номер сторінки (починаючи з 1).</param>
    /// <param name="pageSize">Розмір сторінки.</param>
    /// <param name="sortBy">Поле сортування.</param>
    /// <param name="sortDirection">Напрям сортування.</param>
    /// <param name="filter">Опціональний текстовий фільтр.</param>
    /// <param name="cancellationToken">Токен скасування HTTP-запиту.</param>
    /// <returns>HTTP 200 із пагінованим результатом.</returns>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<CommentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPage(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] CommentSortField sortBy = CommentSortField.CreatedAtUtc,
        [FromQuery] CommentSortDirection sortDirection = CommentSortDirection.Desc,
        [FromQuery] string? filter = null,
        CancellationToken cancellationToken = default)
    {
        var comments = await _mediator.Send(new GetCommentsPageQuery(page, pageSize, sortBy, sortDirection, filter), cancellationToken);
        return Ok(comments);
    }

    /// <summary>
    /// Повертає дерево коментарів відносно конкретного root-коментаря.
    /// </summary>
    /// <param name="rootCommentId">Ідентифікатор кореневого коментаря.</param>
    /// <param name="sortBy">Поле сортування відповідей.</param>
    /// <param name="sortDirection">Напрям сортування відповідей.</param>
    /// <param name="cancellationToken">Токен скасування HTTP-запиту.</param>
    /// <returns>HTTP 200 із деревом коментарів.</returns>
    [HttpGet("{rootCommentId:guid}/thread")]
    [ProducesResponseType(typeof(CommentDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetThread(
        [FromRoute] Guid rootCommentId,
        [FromQuery] CommentSortField sortBy = CommentSortField.CreatedAtUtc,
        [FromQuery] CommentSortDirection sortDirection = CommentSortDirection.Desc,
        CancellationToken cancellationToken = default)
    {
        var thread = await _mediator.Send(new GetCommentThreadQuery(rootCommentId, sortBy, sortDirection), cancellationToken);
        return Ok(thread);
    }

    /// <summary>
    /// Генерує санітизований HTML-preview для переданого тексту.
    /// </summary>
    /// <param name="request">Запит із вхідним текстом для preview.</param>
    /// <param name="cancellationToken">Токен скасування HTTP-запиту.</param>
    /// <returns>HTTP 200 із санітизованим preview.</returns>
    [HttpPost("preview")]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    public async Task<IActionResult> Preview([FromBody] PreviewRequest request, CancellationToken cancellationToken)
    {
        var preview = await _mediator.Send(new PreviewCommentQuery(request.Text), cancellationToken);
        return Ok(preview);
    }

    /// <summary>
    /// Виконує пошук коментарів за повнотекстовим запитом.
    /// </summary>
    /// <param name="q">Рядок пошуку.</param>
    /// <param name="page">Номер сторінки.</param>
    /// <param name="pageSize">Розмір сторінки.</param>
    /// <param name="cancellationToken">Токен скасування HTTP-запиту.</param>
    /// <returns>HTTP 200 із результатами пошуку або HTTP 400 при порожньому запиті.</returns>
    [HttpGet("search")]
    [ProducesResponseType(typeof(PagedResult<CommentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Search(
        [FromQuery] string q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(q))
        {
            return BadRequest("Query 'q' is required.");
        }

        var comments = await _mediator.Send(new SearchCommentsQuery(q, page, pageSize), cancellationToken);
        return Ok(comments);
    }
}
