using Comments.Application.Common.Behaviors;
using Comments.Infrastructure.Persistence;
using Comments.Application.Abstractions;
using Comments.Api.GraphQL;
using Comments.Infrastructure.Text;
using Comments.Infrastructure.Search;
using Comments.Infrastructure.Realtime;
using Comments.Infrastructure.Captcha;
using Comments.Infrastructure.Storage;
using Comments.Infrastructure.Http;
using Comments.Infrastructure.Maintenance;
using Comments.Infrastructure.Messaging;
using Comments.Application.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using MediatR;
using FluentValidation;
using Microsoft.Extensions.FileProviders;
using MassTransit;
using Elastic.Clients.Elasticsearch;

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
    // Реєструє офіційний typed-клієнт Elasticsearch для index/search операцій.
    builder.Services.AddSingleton(sp =>
    {
        var settings = new ElasticsearchClientSettings(new Uri(elasticsearchOptions.Uri))
            .DefaultIndex(elasticsearchOptions.IndexName);
        return new ElasticsearchClient(settings);
    });

    builder.Services.AddScoped<ElasticsearchCommentCreatedChannel>();
    builder.Services.AddScoped<ElasticsearchCommentSearchService>();

    // Реєструємо repository fallback навіть у режимі Elasticsearch,
    // щоб search не «падав в нуль» при тимчасовій недоступності кластера.
    builder.Services.AddScoped<RepositoryCommentSearchService>();
    builder.Services.AddScoped<ICommentCreatedChannel>(sp => sp.GetRequiredService<ElasticsearchCommentCreatedChannel>());
    builder.Services.AddScoped<ICommentSearchService, ResilientCommentSearchService>();
    builder.Services.AddHostedService<ElasticsearchIndexInitializerHostedService>();
    builder.Services.AddHostedService<ElasticsearchBackfillHostedService>();
}
else
{
    // Фолбек на репозиторний пошук, щоб search UI працював навіть без Elasticsearch.
    builder.Services.AddScoped<ICommentSearchService, RepositoryCommentSearchService>();
}

if (rabbitMqOptions.Enabled)
{
    builder.Services.AddSingleton(rabbitMqOptions);
    builder.Services.AddSingleton(processedMessageCleanupOptions);
    builder.Services.AddScoped<ICommentCreatedChannel, MassTransitCommentCreatedPublisher>();

    builder.Services.AddMassTransit(configurator =>
    {
        configurator.AddConsumer<CommentIndexingRequestedConsumer>();
        configurator.AddConsumer<CommentFileProcessingRequestedConsumer>();

        configurator.UsingRabbitMq((context, busConfigurator) =>
        {
            var rabbitMqUri = new Uri($"rabbitmq://{rabbitMqOptions.HostName}:{rabbitMqOptions.Port}/");
            busConfigurator.Host(rabbitMqUri, hostConfigurator =>
            {
                hostConfigurator.Username(rabbitMqOptions.UserName);
                hostConfigurator.Password(rabbitMqOptions.Password);
            });

            busConfigurator.Message<CommentIndexingRequested>(messageConfigurator =>
            {
                messageConfigurator.SetEntityName(rabbitMqOptions.IndexingQueueName);
            });

            busConfigurator.Message<CommentFileProcessingRequested>(messageConfigurator =>
            {
                messageConfigurator.SetEntityName(rabbitMqOptions.FileProcessingQueueName);
            });

            busConfigurator.Publish<CommentIndexingRequested>(publishConfigurator =>
            {
                publishConfigurator.ExchangeType = "direct";
            });

            busConfigurator.Publish<CommentFileProcessingRequested>(publishConfigurator =>
            {
                publishConfigurator.ExchangeType = "direct";
            });

            if (rabbitMqOptions.ConsumerEnabled)
            {
                busConfigurator.ReceiveEndpoint(rabbitMqOptions.IndexingQueueName, endpointConfigurator =>
                {
                    endpointConfigurator.UseMessageRetry(retryConfigurator => retryConfigurator.Interval(rabbitMqOptions.MaxRetryCount, TimeSpan.FromSeconds(2)));
                    endpointConfigurator.UseInMemoryOutbox(context);
                    endpointConfigurator.ConfigureConsumer<CommentIndexingRequestedConsumer>(context);
                });

                busConfigurator.ReceiveEndpoint(rabbitMqOptions.FileProcessingQueueName, endpointConfigurator =>
                {
                    endpointConfigurator.UseMessageRetry(retryConfigurator => retryConfigurator.Interval(rabbitMqOptions.MaxRetryCount, TimeSpan.FromSeconds(2)));
                    endpointConfigurator.UseInMemoryOutbox(context);
                    endpointConfigurator.ConfigureConsumer<CommentFileProcessingRequestedConsumer>(context);
                });
            }
        });
    });

    if (rabbitMqOptions.ConsumerEnabled)
    {
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
    .AddErrorFilter<ValidationExceptionErrorFilter>()
    .AddErrorFilter<BusinessRuleExceptionErrorFilter>();
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
