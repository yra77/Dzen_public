namespace Comments.Application.Abstractions;

public interface ICaptchaValidator
{
    Task<bool> ValidateAsync(string? token, CancellationToken cancellationToken);
}
