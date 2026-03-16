using Comments.Api.Infrastructure;
using Comments.Api.GraphQL;
using Comments.Api.Realtime;
using Comments.Application.Abstractions;
using Comments.Application.Services;
using Microsoft.EntityFrameworkCore;

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

builder.Services.AddScoped<ICommentRepository, EfCommentRepository>();
builder.Services.AddSingleton<ITextSanitizer, BasicTextSanitizer>();
builder.Services.AddSingleton(captchaOptions);
builder.Services.AddScoped<ICaptchaValidator, BasicCaptchaValidator>();
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
}
else
{
    builder.Services.AddScoped<ICommentSearchService, NoOpCommentSearchService>();
}

if (rabbitMqOptions.Enabled)
{
    builder.Services.AddSingleton(rabbitMqOptions);
    builder.Services.AddScoped<ICommentCreatedChannel, RabbitMqCommentCreatedPublisher>();
}

builder.Services.AddSingleton(signalrOptions);
if (signalrOptions.Enabled)
{
    builder.Services.AddScoped<ICommentCreatedChannel, SignalRCommentCreatedChannel>();
}

builder.Services.AddScoped<CommentService>();
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

app.MapControllers();
app.MapGraphQL("/graphql");
app.MapHub<CommentsHub>("/hubs/comments");
app.Run();
