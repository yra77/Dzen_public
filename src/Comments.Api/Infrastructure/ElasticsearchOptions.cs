namespace Comments.Api.Infrastructure;

/// <summary>
/// Налаштування інтеграції з Elasticsearch для пошуку коментарів.
/// </summary>
public sealed class ElasticsearchOptions
{
    /// <summary>
    /// Увімкнення/вимкнення Elasticsearch-компонентів.
    /// </summary>
    public bool Enabled { get; init; }

    /// <summary>
    /// Базова URI-адреса Elasticsearch-кластера.
    /// </summary>
    public string Uri { get; init; } = "http://localhost:9200";

    /// <summary>
    /// Ім'я індексу для документів коментарів.
    /// </summary>
    public string IndexName { get; init; } = "comments";

    /// <summary>
    /// Запуск backfill-індексації під час старту застосунку.
    /// </summary>
    public bool BackfillOnStartup { get; init; } = true;
}
