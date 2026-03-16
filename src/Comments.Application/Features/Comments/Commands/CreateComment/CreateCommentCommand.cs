using Comments.Application.DTOs;
using MediatR;

namespace Comments.Application.Features.Comments.Commands.CreateComment;

public sealed record CreateCommentCommand(CreateCommentRequest Request) : IRequest<CommentDto>;
