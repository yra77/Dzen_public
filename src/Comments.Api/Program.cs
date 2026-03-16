using Comments.Application.Common.Behaviors;
using Comments.Api.Infrastructure;
using Comments.Api.GraphQL;
using Comments.Api.Realtime;
using Comments.Application.Abstractions;
using Comments.Application.Services;
using Microsoft.EntityFrameworkCore;
using MediatR;
using FluentValidation;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

var provider = builder.Configuration["Persistence:Provider"] ?? "InMemory";
var rabbitMqOptions = builder.Configuration.GetSection("RabbitMq").Get<RabbitMqOptions>() ?? new RabbitMqOptions();
var captchaOptions = builder.Configuration.GetSection("Captcha").Get<CaptchaOptions>() ?? new CaptchaOptions();
var attachmentStorageOptions = builder.Configuration.GetSection("Attachments").Get<LocalAttachmentStorageOptions>() ?? new LocalAttachmentStorageOptions();
var signalrOptions = builder.Configuration.GetSection("SignalR").Get<SignalROptions>() ?? new SignalROptions();
var elasticsearchOptions = builder.Configuration.GetSection("Elasticsearch").Get<ElasticsearchOptions>() ?? new ElasticsearchOptions();

builder.Services.AddDbContext<CommentsDbContext>(options =>
{
    if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
    {
        var connectionString = builder.Configuration.GetConnectionString("CommentsDb")
                               ?? throw new InvalidOperationException("Connection string 'CommentsDb' is required for SqlServer provider.");

        options.UseSqlServer(connectionString);
        return;
    }

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
    builder.Services.AddScoped<ICommentCreatedChannel, RabbitMqCommentCreatedPublisher>();

    if (rabbitMqOptions.ConsumerEnabled)
    {
        builder.Services.AddHostedService<RabbitMqTaskQueuesConsumerHostedService>();
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
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services
    .AddGraphQLServer()
    .AddQueryType<CommentQueries>()
    .AddMutationType<CommentMutations>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<CommentsDbContext>();
    await dbContext.Database.EnsureCreatedAsync();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseDefaultFiles();
app.UseStaticFiles();

var attachmentsRootPath = Path.GetFullPath(attachmentStorageOptions.RootPath);
Directory.CreateDirectory(attachmentsRootPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(attachmentsRootPath),
    RequestPath = "/uploads"
});

app.MapControllers();
app.MapGraphQL("/graphql");
app.MapHub<CommentsHub>("/hubs/comments");

app.MapFallbackToFile("index.html");
app.Run();
