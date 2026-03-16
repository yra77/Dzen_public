using Comments.Application.DTOs;
using Comments.Application.Exceptions;
using Comments.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace Comments.Api.Controllers;

[ApiController]
[Route("api/comments")]
public sealed class CommentsController : ControllerBase
{
    private readonly CommentService _commentService;

    public CommentsController(CommentService commentService)
    {
        _commentService = commentService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(CommentDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Create([FromBody] CreateCommentRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var created = await _commentService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetPage), new { page = 1, pageSize = 25 }, created);
        }
        catch (CommentValidationException exception)
        {
            return BadRequest(new { error = exception.Message });
        }
        catch (CommentNotFoundException exception)
        {
            return NotFound(new { error = exception.Message });
        }
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
}
