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
  - EF Core репозиторій (`InMemory` за замовчуванням + підтримка `SqlServer` через конфіг),
  - базовий HTML sanitizer,
  - Swagger в development-режимі.

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
2. Виконати:

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

Після прогона зафіксуйте короткий висновок (p95/p99/error-rate) у
`docs/load-test-middle-results.md` та оновіть посилання на актуальний
`summary`-артефакт.

## Demo

- Запис ключових сценаріїв (3–5 хв): **pending**.
- Лінк на відео для тестування/приймання: `TODO: add demo video URL`.

## Актуальний roadmap продовження (ітерація 15)

- **P0 (критично):**
  - міграція фронтенду на **Angular LTS** у `src/Comments.Web` (список/дерево, create/reply, preview, captcha, attachments, SignalR live updates);
  - впровадження **CQRS + MediatR + FluentValidation** (handlers, validators, pipeline behaviors).
- **P1 (production-hardening):**
  - RabbitMQ: додано базовий runbook `docs/rabbitmq-consumer-runbook.md`; реалізовано персистентну ідемпотентність, cleanup старих `ProcessedMessages`, метрики consumer-обробки та alert-пороги;
  - фінальний прогін `load-test/comments-middle.js` у середовищі з RabbitMQ + Elasticsearch із фіксацією `docs/artifacts/k6-middle-summary.json` і метрик у `docs/load-test-middle-results.md`.
- **P2 (delivery):**
  - додати `Demo`-секцію в README із посиланням на 3–5 хвилинне відео ключових сценаріїв.

> Детальний стан відповідності ТЗ і покроковий backlog див. у `docs/tz-compliance-checklist.md`.

## Продовження робіт (ітерації 16–19)

- Проміжні плани ітерацій 16–19 консолідовано в актуальний аудит і backlog ітерації 20.
- Для поточної роботи використовуйте лише `docs/iteration-20-tz-audit.md` та `docs/tz-compliance-checklist.md`.

## Продовження робіт (ітерація 20)

- Додано оперативний аудит: `docs/iteration-20-tz-audit.md` (коротка відповідь на питання відповідності ТЗ + next steps).
- Ітерація 26: посилено FluentValidation-guard для `CreateComment` (CAPTCHA + attachment pre-validation) і розширено `Comments.Api.Tests` для REST/GraphQL validation-сценаріїв (`thread/preview/create`).
- Ітерація 27: додано Angular LTS standalone scaffold у `src/Comments.Web` (роути `/` і `/thread/:id`, базовий API service для root-list).
- Ітерація 28: реалізовано робочий thread-flow в Angular (`/thread/:id`): завантаження гілки, CAPTCHA image reload і submit reply через `POST /api/comments`.
- Ітерація 29: `thread-page` в Angular доповнено recursive-render reply, live text preview (`POST /api/comments/preview`), attachment upload (base64) і SignalR auto-refresh через `/hubs/comments`.
- Ітерація 30: на root-list реалізовано create flow (submit + preview + captcha + attachment + SignalR live-refresh).
- Ітерація 31: у `src/Comments.Web` додано media-preview вкладень (inline image preview + lazy txt preview) для root-list і thread-view.
- Ітерація 32: для lazy txt-preview у `src/Comments.Web` додано явний loading-state (disabled кнопка + індикатор завантаження) на root-list і thread-view.
- Перевірено поточний статус відповідності: **100% виконання ТЗ ще не досягнуто** (залишається 3 невиконані та 2 частково виконані пункти).
- Актуалізовано backlog у `docs/tz-compliance-checklist.md` і зафіксовано пріоритети:
  1. Angular LTS migration у `src/Comments.Web`;
  2. CQRS + MediatR + FluentValidation;
  3. RabbitMQ hardening + фінальний Middle+ load-test + Demo-артефакт.

> Деталі перевірки див. у `docs/iteration-20-tz-audit.md` і `docs/tz-compliance-checklist.md`.

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

## Наступні кроки (по ТЗ)

- ✅ Підключено EF Core + підтримку SQL Server (через `Persistence:Provider=SqlServer`).
- ✅ Додано GraphQL (HotChocolate): `comments` query + `createComment` mutation.
- ✅ Додано публікацію події `comment.created` у RabbitMQ (опційно, через конфіг `RabbitMq:Enabled=true`).
- ✅ Додано базову CAPTCHA-перевірку під час створення коментаря (`Captcha:Enabled`, `Captcha:ExpectedToken`).
- ✅ Додано базову підтримку вкладень `image/txt` (base64 upload, валідація типу/розміру, локальне збереження).
- ✅ Додано опційну інтеграцію з Elasticsearch (індексація + пошук).
- ✅ Додано CAPTCHA (Basic + опційно reCAPTCHA), завантаження файлів (image/txt), прев’ю та SignalR.
- 🟨 Angular SPA: піднято базовий shell і маршрути; лишається перенести create/reply/preview/captcha/attachments/realtime.

## Поточний статус реалізації (аудит)

### Готово (підтверджено кодом)

- ✅ **Базова доменна модель і сервісний шар**: сутність коментаря, DTO та сервіс зі створенням/вибіркою.
- ✅ **REST API**:
  - `POST /api/comments`
  - `GET /api/comments` (пагінація + сортування)
- ✅ **GraphQL API**:
  - query `comments`, `searchComments`
  - mutation `createComment`
- ✅ **Persistence**:
  - InMemory провайдер за замовчуванням,
  - SqlServer провайдер через конфіг.
- ✅ **Інтеграція подій**:
  - опційна публікація `comment.created` у RabbitMQ.

### Ще не реалізовано (наступний етап)

1. 🔲 **Elasticsearch**
   - ✅ індексація нових коментарів при створенні,
   - ✅ запити повнотекстового пошуку (`text`, `userName`, `email`),
   - ✅ автоматичний бекфіл/реіндексація історичних даних при старті API (`Elasticsearch:BackfillOnStartup`).
2. 🟨 **Антиспам/безпека для форми**
   - ✅ базова серверна CAPTCHA-перевірка у створенні коментаря,
   - ✅ опційна інтеграція з reCAPTCHA (`Captcha:Provider=Recaptcha`, `Captcha:SecretKey`).
3. 🟨 **Файлові вкладення**
   - ✅ upload `image/txt` через API (base64 payload),
   - ✅ валідація MIME-типу та максимального розміру,
   - ✅ локальне збереження з метаданими в коментарі,
   - 🔲 відображення/preview у SPA.
4. 🟨 **Realtime оновлення**
- ✅ Додано SignalR-хаб `/hubs/comments` і публікацію події `commentCreated` при створенні коментаря.
  - ✅ Додано web-клієнт (SPA) з підключенням до хабу і оновленням UI в реальному часі.
5. 🟨 **Frontend (SPA)**
   - ✅ базова таблиця/дерево коментарів + сортування,
   - ✅ перемикач джерела даних у SPA: REST або GraphQL для list/search/create,
   - ✅ форма створення коментаря з базовою клієнтською валідацією,
   - ✅ перегляд вкладень + клієнтський preview перед відправкою,
   - 🟨 розширено Angular-клієнт (`src/Comments.Web`): shell + routing + root list + thread/reply/captcha; лишається перенести preview/attachments/realtime та решту користувацьких сценаріїв з `wwwroot`.

### Рекомендований порядок продовження

1. Спершу реалізувати **upload + CAPTCHA** в API (щоб зафіксувати контракт).
2. Далі додати **SignalR** та подію нового коментаря.
3. Після цього підняти **Angular SPA** (інтеграція з REST/GraphQL/SignalR).
4. Завершити **Elasticsearch** як окремий модуль пошуку, не блокуючи базовий CRUD.
