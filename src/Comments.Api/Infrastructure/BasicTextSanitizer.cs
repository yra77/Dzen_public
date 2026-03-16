using System.Text;
using System.Xml;
using System.Xml.Linq;
using Comments.Application.Abstractions;

namespace Comments.Api.Infrastructure;

public sealed class BasicTextSanitizer : ITextSanitizer
{
    private static readonly HashSet<string> AllowedTags = new(StringComparer.OrdinalIgnoreCase)
    {
        "a",
        "code",
        "i",
        "strong"
    };

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

    private static void ValidateAttributes(XElement element)
    {
        if (element.Name.LocalName.Equals("a", StringComparison.OrdinalIgnoreCase))
        {
            foreach (var attribute in element.Attributes())
            {
                if (!attribute.Name.LocalName.Equals("href", StringComparison.OrdinalIgnoreCase))
                {
                    throw new ArgumentException("Only 'href' attribute is allowed for <a> tags.");
                }

                var href = attribute.Value.Trim();
                if (!Uri.TryCreate(href, UriKind.Absolute, out var uri)
                    || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
                {
                    throw new ArgumentException("<a href> must be a valid absolute http/https URL.");
                }
            }

            return;
        }

        if (element.HasAttributes)
        {
            throw new ArgumentException($"Attributes are not allowed for <{element.Name.LocalName}> tags.");
        }
    }
}
