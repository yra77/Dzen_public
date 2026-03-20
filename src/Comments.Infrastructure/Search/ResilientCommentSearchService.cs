using Comments.Application.Abstractions;
using Comments.Application.DTOs;
using Microsoft.Extensions.Logging;

namespace Comments.Infrastructure.Search;

/// <summary>
/// Декоратор для пошуку, який використовує Elasticsearch як primary-провайдер
/// і автоматично перемикається на репозиторний fallback при помилці інтеграції.
/// </summary>
public sealed class ResilientCommentSearchService : ICommentSearchService
{
    private readonly ElasticsearchCommentSearchService _primarySearchService;
    private readonly RepositoryCommentSearchService _fallbackSearchService;
    private readonly ILogger<ResilientCommentSearchService> _logger;

    /// <summary>
    /// Ініціалізує сервіс з primary та fallback стратегіями пошуку.
    /// </summary>
    /// <param name="primarySearchService">Primary-пошук через Elasticsearch.</param>
    /// <param name="fallbackSearchService">Fallback-пошук через локальний репозиторій.</param>
    /// <param name="logger">Логер для спостережуваності fallback-сценаріїв.</param>
    public ResilientCommentSearchService(
        ElasticsearchCommentSearchService primarySearchService,
        RepositoryCommentSearchService fallbackSearchService,
        ILogger<ResilientCommentSearchService> logger)
    {
        _primarySearchService = primarySearchService;
        _fallbackSearchService = fallbackSearchService;
        _logger = logger;
    }

    /// <summary>
    /// Повертає результати пошуку; при недоступності Elasticsearch виконує repository fallback.
    /// </summary>
    /// <param name="query">Пошуковий рядок користувача.</param>
    /// <param name="page">Номер сторінки (1-based).</param>
    /// <param name="pageSize">Розмір сторінки.</param>
    /// <param name="cancellationToken">Токен скасування.</param>
    /// <returns>Пагінований список коментарів.</returns>
    public async Task<PagedResult<CommentDto>> SearchAsync(
        string query,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        try
        {
            return await _primarySearchService.SearchAsync(query, page, pageSize, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Elasticsearch search failed. Falling back to repository search for query '{Query}'.",
                query);

            return await _fallbackSearchService.SearchAsync(query, page, pageSize, cancellationToken);
        }
    }
}
