namespace Comments.Application.Abstractions;

/// <summary>
/// Контракт санітизації тексту коментаря перед відображенням.
/// </summary>
public interface ITextSanitizer
{
    /// <summary>
    /// Санітизує сирий користувацький текст.
    /// </summary>
    /// <param name="source">Вхідний несанітизований текст.</param>
    /// <returns>Безпечний текст для зберігання/рендерингу.</returns>
    string Sanitize(string source);
}
