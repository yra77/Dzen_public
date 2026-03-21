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
  - REST API пошуку `GET /api/comments/search?q=...` через Elasticsearch,
  - GraphQL endpoint `POST /graphql` (query comments + mutation createComment),
  - EF Core репозиторій (SQLite за замовчуванням для персистентного збереження + підтримка `InMemory` через конфіг),
  - базовий HTML sanitizer,
  - Swagger в development-режимі.

## База даних (актуальний handoff-стан)

- Runtime persistence: **SQLite** (`UseSqlite(...)`), рядок підключення — `ConnectionStrings:CommentsDb`.
- Доменна схема в коді підтримується EF Core міграцією `src/Comments.Api/Migrations/202603180001_InitialMySqlSchema.cs` (назва історична, але міграція описує поточну структуру таблиць для runtime-БД).
- Handoff-артефакт: `db-schema.mwb` містить SQL DDL-знімок поточної структури (`Comments` + `ProcessedMessages`) і синхронізується з EF-міграцією при оновленнях.
- У smoke/handoff схема перевіряється fail-fast скриптом `scripts/check-db-schema-artifact.sh`, який запускається першим кроком у `scripts/go-no-go-check.sh`.

> Якщо README і checklist розходяться, пріоритет має `docs/tz-compliance-checklist.md`.

## Структура

```text
comments-spa/
├── src/
│   ├── Comments.Api/            # ASP.NET Core + GraphQL + SignalR
│   ├── Comments.Application/    # CQRS/service layer, contracts, DTO
│   ├── Comments.Domain/         # Entities + domain logic
│   ├── Comments.Infrastructure/ # Виділений шар під EF/RabbitMQ/Elasticsearch (scaffold)
│   └── Comments.Web/            # Місце під Angular SPA (scaffold)
├── docker-compose.yml
├── README.md
├── load-test/
└── Comments.sln
```

> Наразі частина інфраструктурної реалізації ще фізично знаходиться в `Comments.Api` і буде поступово винесена в `Comments.Infrastructure` на наступних ітераціях.

## Запуск локально

1. Встановити .NET 8 SDK
2. Переконатися, що шлях до SQLite у `src/Comments.Api/appsettings.json` валідний (`ConnectionStrings:CommentsDb`).
3. Виконати:

```bash
dotnet restore Comments.sln
dotnet run --project src/Comments.Api/Comments.Api.csproj
```

3. Відкрити Swagger: `http://localhost:5000/swagger` (або порт, який покаже `dotnet run`).

## QA handoff: перевірка стенду і Go/No-Go

Перед передачею збірки у ручне тестування виконайте дві команди в корені репозиторію:

```bash
# 1) Підняти інфраструктуру й перевірити readiness критичних сервісів
./scripts/qa-stand-check.sh --report-file docs/artifacts/qa-stand-check.json

# 2) Прогнати smoke-набір (backend tests + frontend unit + Playwright e2e)
./scripts/go-no-go-check.sh --report-file docs/artifacts/go-no-go-check.json
```

Рекомендовано зафіксувати commit/tag після успішного smoke-прогону, і саме цей артефакт передавати в QA.

Обидва скрипти підтримують опційний прапорець `--report-file <path>` для збереження машинно-читаного JSON-звіту (статус + UTC timestamp), який можна долучати до QA handoff.

## Load testing (k6)

У репозиторії є два k6-сценарії:

- `load-test/comments-smoke.js` — коротка smoke-перевірка доступності `GET /api/comments`.
- `load-test/comments-middle.js` — розширений змішаний профіль (list/create/search + GraphQL) із threshold-метриками для p95/p99 та помилок.

Приклади запуску:

```bash
# smoke
k6 run load-test/comments-smoke.js

# розширений профіль у mixed-режимі
k6 run load-test/comments-middle.js

# тільки GraphQL (за потреби передайте валідний CAPTCHA token)
API_MODE=graphql CAPTCHA_TOKEN=test k6 run load-test/comments-middle.js

# mixed-профіль + збереження машинно-читаного звіту
k6 run --summary-export=docs/artifacts/k6-middle-summary.json load-test/comments-middle.js
```

Після прогона зафіксуйте короткий висновок (p95/p99/error-rate) у PR/релізних нотатках
та додайте посилання на актуальний `summary`-артефакт.

## Demo

- Запис ключових сценаріїв (3–5 хв): **pending**.
- Лінк на відео для тестування/приймання: `TODO: add demo video URL`.

## Пріоритети продовження робіт

- **P0:** закрити відкриті пункти з `docs/tz-compliance-checklist.md`.
- **P1:** завершити production-hardening RabbitMQ/Elasticsearch + фінальний middle-load-test з артефактом `docs/artifacts/k6-middle-summary.json`.
- **P2:** додати demo-відео ключових сценаріїв (3–5 хв) для QA/приймання.

> Джерело істини для backlog і пріоритетів: `docs/tz-compliance-checklist.md`.

## GraphQL validation contract (`validationErrors`)

Для помилок валідації GraphQL повертає `errors[0].extensions` з уніфікованою формою:

```json
{
  "errors": [
    {
      "message": "Validation failed",
      "extensions": {
        "code": "BAD_USER_INPUT",
        "validationErrors": {
          "Filter": [
            "'Filter' must be 200 characters or fewer."
          ]
        }
      }
    }
  ]
}
```

Приклад для REST того ж кейсу (`GET /api/comments?...&filter=<201 chars>`) повертає `400` із `ValidationProblemDetails`:

```json
{
  "status": 400,
  "errors": {
    "Filter": [
      "'Filter' must be 200 characters or fewer."
    ]
  }
}
```

Таким чином, для UI можна уніфікувати відображення повідомлень через мапу `field -> messages[]` як для REST (`errors`), так і для GraphQL (`extensions.validationErrors`).



## Boundary-приклади валідації (REST/GraphQL)

### REST: невалідні `page/pageSize`

Запит:

```http
GET /api/comments?page=0&pageSize=0
```

Відповідь (`400 Bad Request`):

```json
{
  "status": 400,
  "errors": {
    "Page": ["'Page' must be greater than '0'."],
    "PageSize": ["'Page Size' must be between 1 and 100. You entered 0."]
  }
}
```

### REST: невалідний `captchaToken` у create

Запит:

```http
POST /api/comments
Content-Type: application/json
```

```json
{
  "userName": "User123",
  "email": "user@example.com",
  "text": "Hello",
  "captchaToken": "wrong-token"
}
```

Відповідь (`400 Bad Request`):

```json
{
  "status": 400,
  "errors": {
    "Request.CaptchaToken": ["Captcha validation failed."]
  }
}
```

### GraphQL: невалідне вкладення

Запит:

```graphql
mutation {
  addComment(input: {
    userName: "User123",
    email: "user@example.com",
    text: "Hello",
    captchaToken: "1234",
    attachment: {
      fileName: "note.pdf",
      contentType: "application/pdf",
      base64Content: "SGVsbG8="
    }
  }) {
    id
  }
}
```

Відповідь (`errors[0].extensions`):

```json
{
  "code": "BAD_USER_INPUT",
  "validationErrors": {
    "Request.Attachment.ContentType": [
      "The specified condition was not met for 'Request.Attachment.ContentType'."
    ]
  }
}
```

## Короткий статус по ТЗ

- Реалізовано базові API-шари (REST/GraphQL), валідацію, CAPTCHA, вкладення, SignalR і опційні інтеграції (RabbitMQ/Elasticsearch).
- Актуальний перелік виконаних/невиконаних пунктів ведеться в `docs/tz-compliance-checklist.md`.
- Якщо дані в README та checklist розходяться — довіряйте checklist.
