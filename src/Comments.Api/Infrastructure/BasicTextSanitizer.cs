using System.Net;
using Comments.Application.Abstractions;

namespace Comments.Api.Infrastructure;

public sealed class BasicTextSanitizer : ITextSanitizer
{
    public string Sanitize(string source)
    {
        return WebUtility.HtmlEncode(source.Trim());
    }
}
