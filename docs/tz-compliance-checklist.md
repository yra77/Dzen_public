# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-19.

> Чекліст містить лише актуальний стан реалізації та поточний backlog без застарілих проміжних записів.

## 1) Матриця відповідності ТЗ (поточний стан)

### Backend

| Вимога ТЗ | Статус | Факт у проєкті | Що потрібно доробити |
|---|---|---|---|
| ASP.NET Core 8.0 (LTS) | ✅ Виконано | `Comments.Api` і `Comments.Infrastructure` таргетують `net8.0`. | Підтримувати patch-оновлення .NET 8. |
| Entity Framework Core + SQLite | ✅ Виконано | Налаштовано `UseSqlite`, є міграції EF Core. | Підтримувати міграції та backup/restore-процедури SQLite. |
| GraphQL (HotChocolate) | ✅ Виконано | Працює endpoint `/graphql`, реалізовані query/mutation. | Додати GraphQL contract/integration тести (включно з error-shape). |
| CQRS + MediatR | ✅ Виконано | Команди/запити розділені, `ValidationBehavior` підключено. | Додати інтеграційні перевірки ключових CQRS-ланцюжків. |
| RabbitMQ (MassTransit) | ⚠️ Частково | Є інтеграція через `RabbitMQ.Client`, без MassTransit. | Мігрувати publisher/consumer на MassTransit (retry, DLQ, outbox/idempotency). |
| Elasticsearch (офіційний .NET client) | ⚠️ Частково | Поточний адаптер працює через `HttpClient`. | Перейти на офіційний Elastic .NET client + typed mappings/templates. |
| SignalR | ✅ Виконано | `CommentsHub` + `/hubs/comments` активні, канал публікації винесений у `Comments.Infrastructure`. | Додати перевірки reconnect/backoff у e2e-сценаріях. |
| Clean Architecture + SOLID | ✅ Виконано (базовий шар) | EF DbContext, EF/InMemory repositories, captcha/search/realtime/messaging/maintenance/attachments винесені в `Comments.Infrastructure`. | Наступний крок: додати тестові перевірки залежностей між шарами (architecture tests). |

### Frontend

| Вимога ТЗ | Статус | Факт у проєкті | Що потрібно доробити |
|---|---|---|---|
| Angular (standalone components) | ✅ Виконано | Angular 19, standalone-компоненти. | Продовжити декомпозицію великих сторінок на менші компоненти. |
| Apollo Client (GraphQL) | ✅ Виконано | Apollo Angular підключено; runtime працює через GraphQL. | Налаштувати стабільну cache-стратегію та contract-тести. |
| RxJS | ✅ Виконано | `rxjs` активно використовується в сервісах/компонентах. | Розширити реактивні патерни там, де є імперативні блоки. |

## 2) Зміни, внесені в поточній ітерації (2026-03-19)

1. Перенесено persistence-адаптери (`CommentsDbContext`, `EfCommentRepository`, `EfProcessedMessageRepository`, `InMemoryCommentRepository`) з `Comments.Api/Infrastructure` у `Comments.Infrastructure/Persistence`.
2. Оновлено DI та посилання в `Program.cs` і GraphQL/EF migration файлах на новий namespace `Comments.Infrastructure.Persistence`.
3. Вирівняно таргет `Comments.Infrastructure` на `net8.0` і додано `Microsoft.EntityFrameworkCore` dependency для нового persistence-шару.
4. Актуалізовано чекліст — лишено лише дійсний стан і релевантний backlog.

## 3) Що ще треба зробити далі (актуальний план)

1. **P0 — Messaging:** міграція RabbitMQ інтеграції на MassTransit (producer/consumer, retry, DLQ, idempotency/outbox).
2. **P1 — Search:** перехід з `HttpClient`-інтеграції Elasticsearch на офіційний Elastic .NET client.
3. **P1 — GraphQL quality:** додати контрактні тести для `comments`, `commentThread`, `createComment`, `captchaImage`, `attachmentTextPreview` + негативні кейси (enum/scalar/path traversal).
4. **P1 — Architecture quality:** додати architecture tests, що контролюють напрям залежностей між Domain/Application/Infrastructure/Api.
5. **P2 — Frontend maintainability:** декомпозувати великі Angular-компоненти (`RootListPageComponent`, `ThreadPageComponent`) у дрібні standalone-блоки.

## 4) Правило документування при розробці

- При створенні або редагуванні нових класів/методів додаємо коментарі:
  - для C# публічних елементів — XML-коментарі `///`;
  - для складної логіки — короткі пояснювальні inline-коментарі.

---

Файл ведеться як актуальний робочий чекліст відповідності ТЗ і має оновлюватися у тому ж PR, де змінюється стан реалізації.
