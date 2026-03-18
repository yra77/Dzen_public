# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG TARGETARCH
WORKDIR /src
COPY Comments.sln ./
COPY src/Comments.Domain/Comments.Domain.csproj src/Comments.Domain/
COPY src/Comments.Application/Comments.Application.csproj src/Comments.Application/
COPY src/Comments.Infrastructure/Comments.Infrastructure.csproj src/Comments.Infrastructure/
COPY src/Comments.Api/Comments.Api.csproj src/Comments.Api/
RUN dotnet restore src/Comments.Api/Comments.Api.csproj
COPY . .
RUN dotnet publish src/Comments.Api/Comments.Api.csproj -c Release -a ${TARGETARCH:-x64} -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 5000
ENTRYPOINT ["dotnet", "Comments.Api.dll"]
