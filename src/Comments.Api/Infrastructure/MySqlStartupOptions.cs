namespace Comments.Api.Infrastructure;

/// <summary>
/// Налаштування preflight-очікування доступності MySQL перед запуском EF Core migration.
/// </summary>
public sealed class MySqlStartupOptions
{
    /// <summary>
    /// Назва секції конфігурації для біндінгу опцій зі стандартного appsettings/env.
    /// </summary>
    public const string SectionName = "MySqlStartup";

    /// <summary>
    /// Увімкнути/вимкнути preflight-перевірку доступності MySQL endpoint.
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Максимальний загальний час очікування доступності endpoint (у секундах).
    /// </summary>
    public int MaxWaitSeconds { get; set; } = 90;

    /// <summary>
    /// Пауза між повторними спробами TCP-підключення (у секундах).
    /// </summary>
    public int RetryDelaySeconds { get; set; } = 3;

    /// <summary>
    /// Таймаут одиночної TCP-спроби підключення (у секундах).
    /// </summary>
    public int ConnectTimeoutSeconds { get; set; } = 2;
}
