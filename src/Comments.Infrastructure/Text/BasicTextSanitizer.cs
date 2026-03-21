using System.Text;
using System.Xml;
using System.Xml.Linq;
using Comments.Application.Abstractions;

namespace Comments.Infrastructure.Text;

/// <summary>
/// Базова реалізація санітизатора XHTML для тексту коментарів.
/// Дозволяє лише обмежений whitelist тегів та атрибутів.
/// </summary>
public sealed class BasicTextSanitizer : ITextSanitizer
{
    /// <summary>
    /// Дозволений набір HTML/XHTML тегів у тілі коментаря.
    /// </summary>
    private static readonly HashSet<string> AllowedTags = new(StringComparer.OrdinalIgnoreCase)
    {
        "a",
        "code",
        "i",
        "strong"
    };

    /// <summary>
    /// Перевіряє та санітизує текст коментаря відповідно до whitelist-правил.
    /// </summary>
    /// <param name="source">Вхідний текст користувача.</param>
    /// <returns>Санітизований XHTML-фрагмент без недозволених тегів/атрибутів.</returns>
    public string Sanitize(string source)
    {
        if (string.IsNullOrWhiteSpace(source))
        {
            return string.Empty;
        }

        var trimmed = source.Trim();
        var wrapped = $"<root>{trimmed}</root>";

        XDocument document;
        try
        {
            document = XDocument.Parse(
                wrapped,
                LoadOptions.PreserveWhitespace | LoadOptions.SetLineInfo);
        }
        catch (XmlException exception)
        {
            throw new ArgumentException("Comment text must be valid XHTML.", nameof(source), exception);
        }

        var root = document.Root!;
        ValidateElements(root);

        var builder = new StringBuilder();
        foreach (var node in root.Nodes())
        {
            builder.Append(node.ToString(SaveOptions.DisableFormatting));
        }

        return builder.ToString();
    }

    /// <summary>
    /// Валідовує, що всі елементи входять у whitelist дозволених тегів.
    /// </summary>
    /// <param name="root">Кореневий вузол документа.</param>
    private static void ValidateElements(XElement root)
    {
        foreach (var element in root.Descendants())
        {
            var tag = element.Name.LocalName;
            if (!AllowedTags.Contains(tag))
            {
                throw new ArgumentException(
                    $"HTML tag '{tag}' is not allowed. Allowed tags: a, code, i, strong.");
            }

            ValidateAttributes(element);
        }
    }

    /// <summary>
    /// Валідовує атрибути елемента згідно правил безпеки.
    /// </summary>
    /// <param name="element">Елемент XHTML для перевірки.</param>
    private static void ValidateAttributes(XElement element)
    {
        if (element.Name.LocalName.Equals("a", StringComparison.OrdinalIgnoreCase))
        {
            var hasHref = false;
            foreach (var attribute in element.Attributes())
            {
                if (!attribute.Name.NamespaceName.Equals(string.Empty, StringComparison.Ordinal))
                {
                    throw new ArgumentException("Namespaced attributes are not allowed for <a> tags.");
                }

                if (!attribute.Name.LocalName.Equals("href", StringComparison.OrdinalIgnoreCase))
                {
                    throw new ArgumentException("Only 'href' attribute is allowed for <a> tags.");
                }

                hasHref = true;
                var href = attribute.Value.Trim();
                if (!Uri.TryCreate(href, UriKind.Absolute, out var uri)
                    || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
                {
                    throw new ArgumentException("<a href> must be a valid absolute http/https URL.");
                }
            }

            if (!hasHref)
            {
                throw new ArgumentException("<a> tag must include href attribute.");
            }

            return;
        }

        if (element.HasAttributes)
        {
            throw new ArgumentException($"Attributes are not allowed for <{element.Name.LocalName}> tags.");
        }
    }
}
