using Comments.Application.DTOs;
using Comments.Application.Features.Comments.Commands.CreateComment;
using Comments.Application.Features.Comments.Queries.GetCommentsPage;
using Comments.Application.Features.Comments.Queries.GetCommentThread;
using Comments.Application.Features.Comments.Queries.PreviewComment;
using Comments.Api.Infrastructure;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Comments.Api.Controllers;

[ApiController]
[Route("api/comments")]
public sealed class CommentsController : ControllerBase
{
    public sealed record PreviewRequest(string Text);

    private readonly IMediator _mediator;
    private readonly ICommentSearchService _commentSearchService;

    public CommentsController(IMediator mediator, ICommentSearchService commentSearchService)
    {
        _mediator = mediator;
        _commentSearchService = commentSearchService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(CommentDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateCommentRequest request, CancellationToken cancellationToken)
    {
        var created = await _mediator.Send(new CreateCommentCommand(request), cancellationToken);
        return CreatedAtAction(nameof(GetPage), new { page = 1, pageSize = 25 }, created);
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<CommentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPage(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] CommentSortField sortBy = CommentSortField.CreatedAtUtc,
        [FromQuery] CommentSortDirection sortDirection = CommentSortDirection.Desc,
        CancellationToken cancellationToken = default)
    {
        var comments = await _mediator.Send(new GetCommentsPageQuery(page, pageSize, sortBy, sortDirection), cancellationToken);
        return Ok(comments);
    }

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

    [HttpPost("preview")]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    public async Task<IActionResult> Preview([FromBody] PreviewRequest request, CancellationToken cancellationToken)
    {
        var preview = await _mediator.Send(new PreviewCommentQuery(request.Text), cancellationToken);
        return Ok(preview);
    }

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

        var comments = await _commentSearchService.SearchAsync(q, page, pageSize, cancellationToken);
        return Ok(comments);
    }
}
