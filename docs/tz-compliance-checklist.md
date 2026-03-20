# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-20 (ітерація resilient-search-fallback).

> Документ містить лише актуальний стан реалізації, поточний план і найближчі кроки.

## 1) Матриця відповідності ТЗ (актуально)

### Backend

| Вимога ТЗ | Статус | Поточний стан у репозиторії | Що робимо далі |
|---|---|---|---|
| ASP.NET Core 8.0 (LTS) | ✅ Виконано | Усі backend-проєкти таргетують `net8.0`. | Підтримувати patch-оновлення .NET 8. |
| Entity Framework Core + SQLite | ✅ Виконано | Для `Persistence:Provider=Sqlite` використовується `UseSqlite(...)`, на старті застосовуються міграції. | Підтримувати консистентність SQLite-міграцій. |
| GraphQL (HotChocolate) | ✅ Виконано | Працює endpoint `/graphql` з query/mutation для коментарів, пошуку, preview, captcha. | Додати контрактні перевірки GraphQL-схеми в CI. |
| CQRS + MediatR | ✅ Виконано | Команди/запити реалізовані в `Comments.Application`, валідація підключена через `ValidationBehavior`. | Додати e2e перевірки CQRS-сценаріїв. |
| RabbitMQ (MassTransit) | ⚠️ Частково | Поточна інтеграція побудована на `RabbitMQ.Client`; MassTransit ще не інтегровано. | Міграція на MassTransit: retry, DLQ, outbox, idempotency. |
| Elasticsearch (офіційний .NET client) | ⚠️ Частково | Пошук працює через HTTP-адаптери; додано resilient fallback: при помилці Elasticsearch виконується repository search. | Перейти на офіційний .NET client Elasticsearch + typed mapping/templates. |
| SignalR | ✅ Виконано | Працює `CommentsHub` (`/hubs/comments`) з розсилкою подій про нові коментарі. | Додати регрес-перевірки reconnect/backoff. |
| Clean Architecture + SOLID | ✅ Базово виконано | Шари Domain/Application/Infrastructure/Api розділені, залежності винесені через абстракції. | Додати automated architecture-guard перевірки. |

### Frontend

| Вимога ТЗ | Статус | Поточний стан у репозиторії | Що робимо далі |
|---|---|---|---|
| Angular (standalone components) | ✅ Виконується за планом | `Comments.Web` на standalone-компонентах; для list/thread використано shared form/query/realtime state. Кнопку «Скинути пошук» прибрано; очищення виконується через поле пошуку. | Додати e2e перевірки search-flow (debounce + URL-state + paging/sort). |
| Apollo Client (GraphQL) | ✅ Виконується за планом | Запити/мутації працюють через GraphQL API; помилки уніфіковані через `GraphqlRequestError` + `ApiErrorPresenterService`. | Формалізувати cache-policy та закріпити error UX e2e-тестами. |
| RxJS | ✅ Виконано | `CommentQueryStateStream` покриває list/thread/search; для search реалізовано debounce та обмежений auto-retry для transient-помилок. | Додати e2e перевірки debounce/URL-sync/auto-retry. |
| Якість збірки (Angular compiler warnings) | ⚠️ Частково | Є скрипт `scripts/check-angular-build.sh`; він інтегрований у `scripts/go-no-go-check.sh`. | Винести перевірку в окремий CI job для кожного PR. |

## 2) Пріоритетний план робіт

1. **P0 — Messaging:** перейти з `RabbitMQ.Client` на MassTransit (producer/consumer + retry + DLQ + outbox/idempotency).
2. **P1 — Search:** перейти з low-level HTTP інтеграції Elasticsearch на офіційний .NET client.
3. **P1 — Frontend/RxJS UX:** додати e2e покриття для search/list/thread flow (debounce + URL-sync + paging/sort + auto-retry).
4. **P1 — GraphQL quality:** додати контрактні перевірки GraphQL-операцій у CI та e2e сценарії retry/validation UX.
5. **P2 — Architecture quality:** додати автоматичні перевірки дозволених напрямків залежностей між шарами.
6. **P2 — Build quality gates:** винести Angular warning-gate в окремий CI job і зробити його блокуючим.

## 3) Що внесено в цій ітерації

- Додано `ResilientCommentSearchService`: коли Elasticsearch недоступний або повертає помилку, пошук автоматично перемикається на repository fallback.
- Оновлено DI-реєстрацію в API: в режимі `Elasticsearch.Enabled=true` пошук працює через resilient-декоратор, а не напряму через Elasticsearch-сервіс.
- Очищено checklist: прибрано застарілі формулювання, залишено актуальний стан і наступні кроки.

## 4) Що ще треба зробити у проєкті

- **P0 Messaging:** реалізувати MassTransit-інтеграцію (retry, DLQ, outbox, idempotency).
- **P1 Search:** перевести Elasticsearch на офіційний .NET client та описати typed index mapping/templates.
- **P1 Frontend:** додати e2e сценарії search/list/thread (debounce, URL-sync, paging/sort, retry UX).
- **P1 GraphQL:** додати контрактні перевірки GraphQL-схеми/операцій та негативні кейси у CI.
- **P2 Architecture:** впровадити автоматичну перевірку правил залежностей між шарами.
- **P2 Build quality:** зробити Angular warning-check обовʼязковим у CI.
