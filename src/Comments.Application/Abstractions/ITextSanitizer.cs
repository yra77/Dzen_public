namespace Comments.Application.Abstractions;

public interface ITextSanitizer
{
    string Sanitize(string source);
}
