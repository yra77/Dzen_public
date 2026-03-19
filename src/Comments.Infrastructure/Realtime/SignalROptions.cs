namespace Comments.Infrastructure.Realtime;

/// <summary>
/// Налаштування realtime-каналу SignalR для push-оновлень коментарів.
/// </summary>
public sealed class SignalROptions
{
    /// <summary>
    /// Вмикає/вимикає публікацію подій у SignalR Hub.
    /// </summary>
    public bool Enabled { get; set; }
}
