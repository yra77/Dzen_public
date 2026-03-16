using Comments.Application.DTOs;
using Comments.Application.Services;
using Comments.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace Comments.Api.Controllers;

[ApiController]
[Route("api/comments")]
public sealed class CommentsController : ControllerBase
{
    private readonly CommentService _commentService;
    private readonly ICommentSearchService _commentSearchService;

    public CommentsController(CommentService commentService, ICommentSearchService commentSearchService)
    {
        _commentService = commentService;
        _commentSearchService = commentSearchService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(CommentDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateCommentRequest request, CancellationToken cancellationToken)
    {
        var created = await _commentService.CreateAsync(request, cancellationToken);
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
        var comments = await _commentService.GetPageAsync(page, pageSize, sortBy, sortDirection, cancellationToken);
        return Ok(comments);
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
