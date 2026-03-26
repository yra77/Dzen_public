namespace Comments.Infrastructure.Search;

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
    public string Uri { get; init; } = "http://192.168.0.106:9200";

    /// <summary>
    /// Ім'я індексу для документів коментарів.
    /// </summary>
    public string IndexName { get; init; } = "comments";

    /// <summary>
    /// Запуск backfill-індексації під час старту застосунку.
    /// </summary>
    public bool BackfillOnStartup { get; init; } = true;

    /// <summary>
    /// Визначає, чи має застосунок переривати старт, якщо не вдалося створити/перевірити індекс.
    /// </summary>
    public bool FailStartupOnIndexInitializationError { get; init; }
}
