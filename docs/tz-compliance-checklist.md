# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-19.

> Документ містить тільки актуальний стан реалізації та поточний план робіт.

## 1) Матриця відповідності ТЗ (актуально)

### Backend

| Вимога ТЗ | Статус | Факт у проєкті | Наступна дія |
|---|---|---|---|
| ASP.NET Core 8.0 (LTS) | ✅ Виконано | `Comments.Api` та інші backend-проєкти таргетують `net8.0`. | Підтримувати patch-оновлення .NET 8. |
| Entity Framework Core + SQLite | ✅ Виконано | У `Program.cs` активний провайдер `Sqlite` + автозастосування міграцій на старті. | Тримати міграції SQLite в актуальному стані. |
| GraphQL (HotChocolate) | ✅ Виконано | Працює endpoint `/graphql`, реалізовані `Query`/`Mutation` для коментарів. | Додати контрактні перевірки GraphQL-схеми (локально/CI). |
| CQRS + MediatR | ✅ Виконано | Команди/запити винесені у `Comments.Application`, підключено `ValidationBehavior`. | Додати інтеграційні перевірки CQRS-ланцюжків (без фіксації тестів у репозиторії до окремого рішення). |
| RabbitMQ (MassTransit) | ⚠️ Частково | Є робоча інтеграція через `RabbitMQ.Client` (publisher/consumer), MassTransit ще не підключено. | Міграція на MassTransit: retry/DLQ/outbox/idempotency. |
| Elasticsearch (офіційний .NET client) | ⚠️ Частково | Є інтеграція через `HttpClient`, пошук вмикається конфігурацією `Elasticsearch.Enabled`. | Перейти на офіційний Elastic .NET client + typed mappings/templates. |
| SignalR | ✅ Виконано | Налаштовано `CommentsHub` та endpoint `/hubs/comments` для realtime-оновлень. | Закрити сценарії reconnect/backoff у перевірках якості. |
| Clean Architecture + SOLID | ✅ Базово виконано | Шари Domain/Application/Infrastructure/Api розділені, інфраструктурні адаптери винесені в Infrastructure. | Додати automated architecture-guard перевірки залежностей між шарами. |

### Frontend

| Вимога ТЗ | Статус | Факт у проєкті | Наступна дія |
|---|---|---|---|
| Angular (standalone components) | ✅ Виконано | `Comments.Web` побудований на Angular standalone-компонентах. | Продовжити декомпозицію великих page-компонентів. |
| Apollo Client (GraphQL) | ✅ Виконано | Apollo Angular підключено, запити/мутації працюють через GraphQL API. | Стабілізувати cache-policy і помилки мережі на UI. |
| RxJS | ✅ Виконано | RxJS використовується в сервісах та компонентах UI. | Уніфікувати reactive-патерни в довгих UI-сценаріях. |

## 2) Що зроблено в цій ітерації

1. Очищено чекліст від застарілих проміжних записів і залишено тільки релевантні пункти по фактичному стану репозиторію.
2. Синхронізовано формулювання backend-вимог з поточною конфігурацією (`Sqlite` за замовчуванням, `RabbitMQ.Client`, `HttpClient` для Elasticsearch).
3. Уточнено формат наступних кроків як короткий executable backlog без історичних нотаток.

## 3) Що далі робити в проєкті (пріоритет)

1. **P0 — Messaging:** перевести RabbitMQ інтеграцію на MassTransit (producer + consumer + retry + DLQ + outbox/idempotency).
2. **P1 — Search:** замінити поточний `HttpClient`-підхід на офіційний Elastic .NET client.
3. **P1 — Frontend maintainability:** декомпозувати великі Angular-сторінки (`RootListPageComponent`, `ThreadPageComponent`) на менші standalone-компоненти.
4. **P1 — GraphQL quality:** додати contract-перевірки запитів/мутацій і негативних кейсів в окремому узгодженому форматі.
5. **P2 — Architecture quality:** додати перевірки напрямків залежностей між шарами.

## 4) Примітка щодо перевірок під час розробки

- Локальні перевірки/тимчасові тести для самоперевірки виконуються за потреби, але без додавання тестових артефактів у репозиторій до окремого узгодження.

---

Файл підтримується як робочий актуальний чекліст відповідності ТЗ і оновлюється разом зі змінами стану реалізації.
