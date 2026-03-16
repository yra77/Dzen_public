namespace Comments.Application.Exceptions;

public sealed class CommentNotFoundException : Exception
{
    public CommentNotFoundException(string message) : base(message)
    {
    }
}
