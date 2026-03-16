namespace Comments.Application.Exceptions;

public sealed class CommentValidationException : Exception
{
    public CommentValidationException(string message) : base(message)
    {
    }
}
