# Dzen_public — стартовий каркас SPA «Коментарі»

У репозиторії підготовлено **базовий backend-каркас на .NET 8** для ТЗ по SPA-коментарях з фокусом на OOP/SOLID і розділення відповідальностей.

## Що вже реалізовано

- `Comments.Domain`:
  - доменна сутність `Comment` з підтримкою вкладених відповідей.
- `Comments.Application`:
  - контракти (`ICommentRepository`, `ITextSanitizer`),
  - DTO,
  - `CommentService` (валідація, санітизація, бізнес-логіка створення/вибірки).
- `Comments.Api`:
  - REST API `POST /api/comments`, `GET /api/comments`,
  - in-memory репозиторій,
  - базовий HTML sanitizer,
  - Swagger в development-режимі.

## Структура

```text
src/
  Comments.Domain/
  Comments.Application/
  Comments.Api/
Comments.sln
```

## Запуск локально

1. Встановити .NET 8 SDK
2. Виконати:

```bash
dotnet restore Comments.sln
dotnet run --project src/Comments.Api/Comments.Api.csproj
```

3. Відкрити Swagger: `http://localhost:5000/swagger` (або порт, який покаже `dotnet run`).

## Наступні кроки (по ТЗ)

- Підключити EF Core + SQL Server.
- Додати GraphQL (HotChocolate).
- Інтегрувати RabbitMQ + Elasticsearch.
- Додати CAPTCHA, завантаження файлів (image/txt), прев’ю та SignalR.
- Підняти Angular SPA (таблиця, пагінація, сортування, nested thread view).
