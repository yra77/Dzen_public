using Comments.Api.Infrastructure;
using Comments.Application.Abstractions;
using Comments.Application.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var provider = builder.Configuration["Persistence:Provider"] ?? "InMemory";

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
builder.Services.AddScoped<CommentService>();
builder.Services.AddControllers();
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
app.Run();
