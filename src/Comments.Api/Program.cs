using Comments.Api.Infrastructure;
using Comments.Application.Abstractions;
using Comments.Application.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<ICommentRepository, InMemoryCommentRepository>();
builder.Services.AddSingleton<ITextSanitizer, BasicTextSanitizer>();
builder.Services.AddScoped<CommentService>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapControllers();
app.Run();
