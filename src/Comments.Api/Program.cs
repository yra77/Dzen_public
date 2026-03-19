using Comments.Application.Common.Behaviors;
using Comments.Api.Infrastructure;
using Comments.Application.Abstractions;
using Comments.Api.GraphQL;
using Comments.Api.Realtime;
using Comments.Infrastructure.Text;
using Comments.Infrastructure.Search;
using Comments.Application.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using MediatR;
using FluentValidation;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// Визначає провайдер persistence; за замовчуванням працюємо з SQLite як з локальною файловою БД.
var provider = builder.Configuration["Persistence:Provider"] ?? "Sqlite";
var rabbitMqOptions = builder.Configuration.GetSection("RabbitMq").Get<RabbitMqOptions>() ?? new RabbitMqOptions();
var captchaOptions = builder.Configuration.GetSection("Captcha").Get<CaptchaOptions>() ?? new CaptchaOptions();
var attachmentStorageOptions = builder.Configuration.GetSection("Attachments").Get<LocalAttachmentStorageOptions>() ?? new LocalAttachmentStorageOptions();
var signalrOptions = builder.Configuration.GetSection("SignalR").Get<SignalROptions>() ?? new SignalROptions();
var elasticsearchOptions = builder.Configuration.GetSection("Elasticsearch").Get<ElasticsearchOptions>() ?? new ElasticsearchOptions();
var processedMessageCleanupOptions = builder.Configuration.GetSection(ProcessedMessageCleanupOptions.SectionName).Get<ProcessedMessageCleanupOptions>() ?? new ProcessedMessageCleanupOptions();

builder.Services.AddDbContext<CommentsDbContext>(options =>
{
    // Основний сценарій: SQLite у файлі без окремого серверу БД.
    if (provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
    {
        var connectionString = builder.Configuration.GetConnectionString("CommentsDb")
                               ?? throw new InvalidOperationException("Connection string 'CommentsDb' is required for Sqlite provider.");
        var normalizedConnectionString = EnsureSqliteDatabasePath(connectionString, builder.Environment.ContentRootPath);

        options.UseSqlite(normalizedConnectionString);
        return;
    }

    // Fallback для тестових локальних сценаріїв без зовнішньої БД.
    options.UseInMemoryDatabase("CommentsDb");
});

builder.Services.AddMemoryCache();
builder.Services.AddSingleton<BasicCaptchaChallengeStore>();
builder.Services.AddSingleton<CaptchaChallengeService>();
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

    // Для SQLite запускаємо EF Core migration, для InMemory залишаємо EnsureCreated.
    if (provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
    {
        try
        {
            await dbContext.Database.MigrateAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Не вдалося застосувати SQLite-міграції під час старту застосунку.");
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

/// <summary>
/// Normalizes SQLite file path and ensures the parent directory exists before EF opens a connection.
/// </summary>
/// <param name="connectionString">Raw SQLite connection string from configuration.</param>
/// <param name="contentRootPath">Application content root used for resolving relative paths.</param>
/// <returns>Connection string with normalized absolute path for file-based SQLite databases.</returns>
static string EnsureSqliteDatabasePath(string connectionString, string contentRootPath)
{
    var sqliteBuilder = new SqliteConnectionStringBuilder(connectionString);
    var dataSource = sqliteBuilder.DataSource;

    if (string.IsNullOrWhiteSpace(dataSource) || dataSource.Equals(":memory:", StringComparison.Ordinal))
    {
        return connectionString;
    }

    var normalizedDataSource = Path.IsPathRooted(dataSource)
        ? dataSource
        : Path.GetFullPath(Path.Combine(contentRootPath, dataSource));

    var directoryPath = Path.GetDirectoryName(normalizedDataSource);
    if (!string.IsNullOrWhiteSpace(directoryPath))
    {
        Directory.CreateDirectory(directoryPath);
    }

    sqliteBuilder.DataSource = normalizedDataSource;
    return sqliteBuilder.ToString();
}

public partial class Program { }
