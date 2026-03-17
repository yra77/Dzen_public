namespace Comments.Application.DTOs;

/// <summary>
/// Узагальнена DTO-модель сторінки з пагінацією.
/// </summary>
/// <typeparam name="T">Тип елементів у сторінці.</typeparam>
/// <param name="Page">Номер поточної сторінки (від 1).</param>
/// <param name="PageSize">Кількість елементів на сторінку.</param>
/// <param name="TotalCount">Загальна кількість елементів до пагінації.</param>
/// <param name="Items">Колекція елементів поточної сторінки.</param>
public sealed record PagedResult<T>(
    int Page,
    int PageSize,
    int TotalCount,
    IReadOnlyCollection<T> Items);
