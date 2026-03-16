namespace Comments.Api.Infrastructure;

public sealed class CaptchaOptions
{
    public bool Enabled { get; set; } = true;
    public string? ExpectedToken { get; set; }
}
