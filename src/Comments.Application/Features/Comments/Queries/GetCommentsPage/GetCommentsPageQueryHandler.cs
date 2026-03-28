

using Comments.Application.DTOs;
using Comments.Application.Services;

using MediatR;


namespace Comments.Application.Features.Comments.Queries.GetCommentsPage;
/// <summary>
/// Обробник MediatR, який делегує отримання кореневої сторінки коментарів рівню доменного сервісу.
/// </summary>
public sealed class GetCommentsPageQueryHandler : IRequestHandler<GetCommentsPageQuery, PagedResult<CommentDto>>
{


    private readonly CommentService _commentService;

    
    /// <summary>
    /// Створює обробник запитів для кореневих сторінок коментарів.
    /// </summary>
    /// <param name="commentService">Сервіс, який інкапсулює логіку пошуку сторінок.</param>
    public GetCommentsPageQueryHandler(CommentService commentService)
    {
        _commentService = commentService;
    }


    /// <summary>
    /// Обробляє запит для кореневої сторінки коментарів з опціями сортування та фільтрації.
    /// </summary>
    /// <param name="request">Параметри запиту від абонента.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Результат коментаря з розгортанням сторінки для запитуваних параметрів сторінки.</returns>
    public Task<PagedResult<CommentDto>> Handle(GetCommentsPageQuery request, CancellationToken cancellationToken)
    {
        return _commentService.GetPageAsync(
            request.Page,
            request.PageSize,
            request.SortBy,
            request.SortDirection,
            request.Filter,
            cancellationToken);
    }
}