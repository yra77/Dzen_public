namespace Comments.Api.Infrastructure;

public sealed class CaptchaOptions
{
    public bool Enabled { get; set; } = true;
    public string Provider { get; set; } = "Basic";
    public string? ExpectedToken { get; set; }
    public string VerifyEndpoint { get; set; } = "https://www.google.com/recaptcha/api/siteverify";
    public string? SecretKey { get; set; }
}
