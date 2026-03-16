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
  - REST API `POST /api/comments`, `GET /api/comments` (пагінація + сортування),
  - GraphQL endpoint `POST /graphql` (query comments + mutation createComment),
  - EF Core репозиторій (`InMemory` за замовчуванням + підтримка `SqlServer` через конфіг),
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

- ✅ Підключено EF Core + підтримку SQL Server (через `Persistence:Provider=SqlServer`).
- ✅ Додано GraphQL (HotChocolate): `comments` query + `createComment` mutation.
- ✅ Додано публікацію події `comment.created` у RabbitMQ (опційно, через конфіг `RabbitMq:Enabled=true`).
- ✅ Додано базову CAPTCHA-перевірку під час створення коментаря (`Captcha:Enabled`, `Captcha:ExpectedToken`).
- Інтегрувати Elasticsearch.
- Додати CAPTCHA, завантаження файлів (image/txt), прев’ю та SignalR.
- Підняти Angular SPA (таблиця, nested thread view).

## Поточний статус реалізації (аудит)

### Готово (підтверджено кодом)

- ✅ **Базова доменна модель і сервісний шар**: сутність коментаря, DTO та сервіс зі створенням/вибіркою.
- ✅ **REST API**:
  - `POST /api/comments`
  - `GET /api/comments` (пагінація + сортування)
- ✅ **GraphQL API**:
  - query `comments`
  - mutation `createComment`
- ✅ **Persistence**:
  - InMemory провайдер за замовчуванням,
  - SqlServer провайдер через конфіг.
- ✅ **Інтеграція подій**:
  - опційна публікація `comment.created` у RabbitMQ.

### Ще не реалізовано (наступний етап)

1. 🔲 **Elasticsearch**
   - індексація коментарів,
   - запити пошуку/фільтрації,
   - синхронізація з основним сховищем.
2. 🟨 **Антиспам/безпека для форми**
   - ✅ базова серверна CAPTCHA-перевірка у створенні коментаря,
   - 🔲 інтеграція з реальною CAPTCHA-платформою (наприклад, reCAPTCHA/hCaptcha).
3. 🔲 **Файлові вкладення**
   - upload `image/txt`,
   - валідація та безпечне збереження,
   - відображення/preview.
4. 🔲 **Realtime оновлення**
   - SignalR-хаб для появи нових коментарів без перезавантаження.
5. 🔲 **Frontend (Angular SPA)**
   - таблиця + сортування,
   - nested thread view,
   - форма коментаря з клієнтською валідацією.

### Рекомендований порядок продовження

1. Спершу реалізувати **upload + CAPTCHA** в API (щоб зафіксувати контракт).
2. Далі додати **SignalR** та подію нового коментаря.
3. Після цього підняти **Angular SPA** (інтеграція з REST/GraphQL/SignalR).
4. Завершити **Elasticsearch** як окремий модуль пошуку, не блокуючи базовий CRUD.
