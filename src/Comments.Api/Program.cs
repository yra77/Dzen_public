using Comments.Application.Common.Behaviors;
using Comments.Api.Infrastructure;
using Comments.Application.Abstractions;
using Comments.Api.GraphQL;
using Comments.Api.Realtime;
using Comments.Application.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using MediatR;
using FluentValidation;
using Microsoft.Extensions.FileProviders;
using MySqlConnector;
using System.Net.Sockets;

var builder = WebApplication.CreateBuilder(args);

// Визначає провайдер persistence; за замовчуванням використовуємо MySql для реального збереження коментарів.
var provider = builder.Configuration["Persistence:Provider"] ?? "MySql";
var rabbitMqOptions = builder.Configuration.GetSection("RabbitMq").Get<RabbitMqOptions>() ?? new RabbitMqOptions();
var captchaOptions = builder.Configuration.GetSection("Captcha").Get<CaptchaOptions>() ?? new CaptchaOptions();
var attachmentStorageOptions = builder.Configuration.GetSection("Attachments").Get<LocalAttachmentStorageOptions>() ?? new LocalAttachmentStorageOptions();
var signalrOptions = builder.Configuration.GetSection("SignalR").Get<SignalROptions>() ?? new SignalROptions();
var elasticsearchOptions = builder.Configuration.GetSection("Elasticsearch").Get<ElasticsearchOptions>() ?? new ElasticsearchOptions();
var processedMessageCleanupOptions = builder.Configuration.GetSection(ProcessedMessageCleanupOptions.SectionName).Get<ProcessedMessageCleanupOptions>() ?? new ProcessedMessageCleanupOptions();
var mySqlStartupOptions = builder.Configuration.GetSection(MySqlStartupOptions.SectionName).Get<MySqlStartupOptions>() ?? new MySqlStartupOptions();

builder.Services.AddDbContext<CommentsDbContext>(options =>
{
    // Підтримка сумісності з існуючим сценарієм запуску через SQL Server.
    if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
    {
        var connectionString = builder.Configuration.GetConnectionString("CommentsDb")
                               ?? throw new InvalidOperationException("Connection string 'CommentsDb' is required for SqlServer provider.");

        options.UseSqlServer(connectionString);
        return;
    }

    // Основний production/dev сценарій: зберігання коментарів та даних автора в MySQL.
    if (provider.Equals("MySql", StringComparison.OrdinalIgnoreCase))
    {
        var connectionString = builder.Configuration.GetConnectionString("CommentsDb")
                               ?? throw new InvalidOperationException("Connection string 'CommentsDb' is required for MySql provider.");

        // Не використовуємо AutoDetect, щоб уникнути мережевого конекту під час конфігурування DI.
        // Додаємо retry policy для тимчасових помилок доступності MySQL на старті застосунку.
        options.UseMySql(
            connectionString,
            new MySqlServerVersion(new Version(8, 0, 36)),
            mySqlOptions => mySqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(10),
                errorNumbersToAdd: null));
        return;
    }

    // Fallback для тестових локальних сценаріїв без зовнішньої БД.
    options.UseInMemoryDatabase("CommentsDb");
});

builder.Services.AddMemoryCache();
builder.Services.AddSingleton<BasicCaptchaChallengeStore>();
builder.Services.AddScoped<ICommentRepository, EfCommentRepository>();
builder.Services.AddScoped<IProcessedMessageRepository, EfProcessedMessageRepository>();
builder.Services.AddSingleton<ITextSanitizer, BasicTextSanitizer>();
builder.Services.AddSingleton(captchaOptions);
if (captchaOptions.Provider.Equals("Recaptcha", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddHttpClient<RecaptchaCaptchaValidator>();
    builder.Services.AddScoped<ICaptchaValidator>(sp => sp.GetRequiredService<RecaptchaCaptchaValidator>());
}
else
{
    builder.Services.AddScoped<ICaptchaValidator, BasicCaptchaValidator>();
}
builder.Services.AddSingleton(attachmentStorageOptions);
builder.Services.AddScoped<IAttachmentStorage, LocalAttachmentStorage>();

builder.Services.AddScoped<ICommentCreatedPublisher, CompositeCommentCreatedPublisher>();
builder.Services.AddSingleton(elasticsearchOptions);

if (elasticsearchOptions.Enabled)
{
    builder.Services.AddHttpClient<ElasticsearchCommentCreatedChannel>(client =>
    {
        client.BaseAddress = new Uri(elasticsearchOptions.Uri);
    });

    builder.Services.AddHttpClient<ElasticsearchCommentSearchService>(client =>
    {
        client.BaseAddress = new Uri(elasticsearchOptions.Uri);
    });

    builder.Services.AddScoped<ICommentCreatedChannel>(sp => sp.GetRequiredService<ElasticsearchCommentCreatedChannel>());
    builder.Services.AddScoped<ICommentSearchService>(sp => sp.GetRequiredService<ElasticsearchCommentSearchService>());
    builder.Services.AddHostedService<ElasticsearchBackfillHostedService>();
}
else
{
    builder.Services.AddScoped<ICommentSearchService, NoOpCommentSearchService>();
}

if (rabbitMqOptions.Enabled)
{
    builder.Services.AddSingleton(rabbitMqOptions);
    builder.Services.AddSingleton(processedMessageCleanupOptions);
    builder.Services.AddScoped<ICommentCreatedChannel, RabbitMqCommentCreatedPublisher>();

    if (rabbitMqOptions.ConsumerEnabled)
    {
        builder.Services.AddHostedService<RabbitMqTaskQueuesConsumerHostedService>();
        builder.Services.AddHostedService<ProcessedMessageCleanupHostedService>();
    }
}

builder.Services.AddSingleton(signalrOptions);
builder.Services.AddSingleton(mySqlStartupOptions);
if (signalrOptions.Enabled)
{
    builder.Services.AddScoped<ICommentCreatedChannel, SignalRCommentCreatedChannel>();
}

builder.Services.AddScoped<CommentService>();
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblyContaining<CommentService>());
builder.Services.AddValidatorsFromAssemblyContaining<CommentService>();
builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
builder.Services.AddCors(options =>
{
    // Дозволяє Angular-dev-server взаємодіяти з API та SignalR під час локальної розробки.
    options.AddPolicy("CommentsWebDevClient", policy =>
    {
        policy
            .WithOrigins("http://localhost:4200", "http://127.0.0.1:4200")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services
    .AddGraphQLServer()
    .AddQueryType<CommentQueries>()
    .AddMutationType<CommentMutations>()
    .AddErrorFilter<ValidationExceptionErrorFilter>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<CommentsDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("StartupDatabaseInitialization");
    var connectionString = builder.Configuration.GetConnectionString("CommentsDb") ?? string.Empty;
    var mySqlTarget = BuildMySqlTarget(connectionString);

    // Для реляційних провайдерів застосовуємо migration-процес, для InMemory лишаємось на EnsureCreated.
    if (provider.Equals("MySql", StringComparison.OrdinalIgnoreCase) ||
        provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
    {
        try
        {
            if (provider.Equals("MySql", StringComparison.OrdinalIgnoreCase))
            {
                // Перед запуском EF Core migration очікуємо доступність TCP endpoint MySQL,
                // щоб уникати миттєвого падіння API у docker-compose при "одночасному" старті контейнерів.
                await WaitForMySqlAvailabilityAsync(connectionString, mySqlStartupOptions, logger, app.Lifetime.ApplicationStopping);
            }

            await dbContext.Database.MigrateAsync();
        }
        catch (RetryLimitExceededException ex) when (provider.Equals("MySql", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogError(
                ex,
                "Не вдалося застосувати міграції MySQL після вичерпання retry policy. " +
                "Ціль підключення: {MySqlTarget}. Перевірте, що MySQL запущено та доступне по host/port.",
                mySqlTarget);
            throw;
        }
        catch (MySqlException ex) when (provider.Equals("MySql", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogError(
                ex,
                "Не вдалося підключитись до MySQL під час застосування міграцій. " +
                "Ціль підключення: {MySqlTarget}. Перевірте host/port/credentials у ConnectionStrings:CommentsDb.",
                mySqlTarget);
            throw;
        }
    }
    else
    {
        await dbContext.Database.EnsureCreatedAsync();
    }
}

app.UseMiddleware<ValidationExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseDefaultFiles();
app.UseStaticFiles();

// Підключає CORS-політику для Angular SPA та SignalR в локальному dev-режимі.
app.UseCors("CommentsWebDevClient");

var attachmentsRootPath = System.IO.Path.GetFullPath(attachmentStorageOptions.RootPath);
Directory.CreateDirectory(attachmentsRootPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(attachmentsRootPath),
    RequestPath = "/uploads"
});

app.MapControllers();
app.MapGraphQL("/graphql");
app.MapHub<CommentsHub>("/hubs/comments");
// Provides a lightweight readiness endpoint for local QA stand checks.
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapFallbackToFile("index.html");
app.Run();

// Повертає безпечний для логування опис цілі MySQL без пароля, щоб швидше діагностувати проблеми з підключенням.
static string BuildMySqlTarget(string connectionString)
{
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return "(connection string is empty)";
    }

    var csb = new MySqlConnectionStringBuilder(connectionString);
    return $"Server={csb.Server};Port={csb.Port};Database={csb.Database};User={csb.UserID};";
}

// Очікує доступність MySQL по host/port, щоб старт застосунку був стабільнішим у контейнерних середовищах.
static async Task WaitForMySqlAvailabilityAsync(
    string connectionString,
    MySqlStartupOptions options,
    ILogger logger,
    CancellationToken cancellationToken)
{
    if (!options.Enabled)
    {
        return;
    }

    var csb = new MySqlConnectionStringBuilder(connectionString);
    var host = csb.Server;
    var port = (int)csb.Port;
    var deadline = DateTime.UtcNow.AddSeconds(options.MaxWaitSeconds);
    var attempt = 0;

    while (DateTime.UtcNow < deadline)
    {
        cancellationToken.ThrowIfCancellationRequested();
        attempt++;

        try
        {
            using var tcpClient = new TcpClient();
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(options.ConnectTimeoutSeconds));
            await tcpClient.ConnectAsync(host, port, timeoutCts.Token);

            logger.LogInformation(
                "MySQL endpoint {Host}:{Port} став доступним перед стартом migration (attempt {Attempt}).",
                host,
                port,
                attempt);
            return;
        }
        catch (Exception ex) when (ex is SocketException || ex is OperationCanceledException)
        {
            logger.LogWarning(
                "Очікуємо доступність MySQL endpoint {Host}:{Port} (attempt {Attempt}). Наступна спроба через {DelaySeconds} с.",
                host,
                port,
                attempt,
                options.RetryDelaySeconds);
        }

        await Task.Delay(TimeSpan.FromSeconds(options.RetryDelaySeconds), cancellationToken);
    }

    throw new TimeoutException(BuildMySqlPreflightTimeoutMessage(host, port, options.MaxWaitSeconds));
}

// Формує зрозуміле повідомлення таймауту preflight, щоб швидко відрізнити локальну проблему запуску MySQL
// від помилки docker-compose мережі або невірного host у connection string.
static string BuildMySqlPreflightTimeoutMessage(string host, int port, int maxWaitSeconds)
{
    var baseMessage = $"MySQL endpoint {host}:{port} недоступний після {maxWaitSeconds} секунд очікування preflight.";
    if (string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(host, "127.0.0.1", StringComparison.OrdinalIgnoreCase))
    {
        return $"{baseMessage} Локальний сценарій: запустіть MySQL локально (або через docker compose) " +
               "чи змініть ConnectionStrings:CommentsDb на актуальний host контейнера/сервера.";
    }

    return $"{baseMessage} Перевірте DNS/host, порт і доступність сервісу MySQL у поточному середовищі.";
}


public partial class Program { }
