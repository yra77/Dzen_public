# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-20 (ітерація graphql-mutation-negative-contract-gate).

> Документ містить лише актуальний стан реалізації, поточний план і найближчі кроки.

## 1) Матриця відповідності ТЗ (актуально)

### Backend

| Вимога ТЗ | Статус | Поточний стан у репозиторії | Що робимо далі |
|---|---|---|---|
| ASP.NET Core 8.0 (LTS) | ✅ Виконано | Усі backend-проєкти таргетують `net8.0`. | Підтримувати patch-оновлення .NET 8. |
| Entity Framework Core + SQLite | ✅ Виконано | Для `Persistence:Provider=Sqlite` використовується `UseSqlite(...)`, на старті застосовуються міграції. | Підтримувати консистентність SQLite-міграцій. |
| GraphQL (HotChocolate) | ✅ Виконується за планом | Працює endpoint `/graphql`; CI перевіряє root query/mutation поля, invalid field case та негативний mutation-кейс (`BAD_USER_INPUT` + `validationErrors`). | Додати окремі негативні кейси для `addReply` (наприклад, неіснуючий `parentId`) та уніфікувати snapshot-контракт помилок. |
| CQRS + MediatR | ✅ Виконано | Команди/запити реалізовані в `Comments.Application`, валідація підключена через `ValidationBehavior`. | Додати e2e перевірки CQRS-сценаріїв. |
| RabbitMQ (MassTransit) | ⚠️ Частково | Поточна інтеграція побудована на `RabbitMQ.Client`; MassTransit ще не інтегровано. | Міграція на MassTransit: retry, DLQ, outbox, idempotency. |
| Elasticsearch (офіційний .NET client) | ⚠️ Частково | Пошук працює через HTTP-адаптери; є resilient fallback на repository search при збоях Elasticsearch. | Перейти на офіційний .NET client Elasticsearch + typed mapping/templates. |
| SignalR | ✅ Виконано | Працює `CommentsHub` (`/hubs/comments`) з розсилкою подій про нові коментарі. | Додати регрес-перевірки reconnect/backoff. |
| Clean Architecture + SOLID | ✅ Базово виконано | Шари Domain/Application/Infrastructure/Api розділені, залежності винесені через абстракції. | Додати automated architecture-guard перевірки. |

### Frontend

| Вимога ТЗ | Статус | Поточний стан у репозиторії | Що робимо далі |
|---|---|---|---|
| Angular (standalone components) | ✅ Виконується за планом | `Comments.Web` на standalone-компонентах; list/thread працюють через shared form/query/realtime state. | Додати e2e перевірки search-flow (debounce + URL-state + paging/sort). |
| Apollo Client (GraphQL) | ✅ Виконується за планом | Запити/мутації працюють через GraphQL API; помилки уніфіковані через `GraphqlRequestError` + `ApiErrorPresenterService`. | Закріпити UX-поведінку помилок e2e-сценаріями. |
| RxJS | ✅ Виконано | `CommentQueryStateStream` покриває list/thread/search; для search реалізовано debounce та обмежений auto-retry для transient-помилок. | Додати e2e перевірки debounce/URL-sync/auto-retry. |
| Якість збірки (Angular compiler warnings) | ⚠️ Частково | Є скрипт `scripts/check-angular-build.sh`; він інтегрований у `scripts/go-no-go-check.sh`. | Винести Angular warning-gate в окремий блокуючий CI workflow. |

## 2) Пріоритетний план робіт

1. **P0 — Messaging:** перейти з `RabbitMQ.Client` на MassTransit (producer/consumer + retry + DLQ + outbox/idempotency).
2. **P1 — Search:** перейти з low-level HTTP інтеграції Elasticsearch на офіційний .NET client.
3. **P1 — Frontend/RxJS UX:** додати e2e покриття для search/list/thread flow (debounce + URL-sync + paging/sort + auto-retry).
4. **P1 — GraphQL quality:** додати окремі негативні контрактні кейси для `addReply` та зафіксувати стабільний контракт `error.extensions`.
5. **P2 — Architecture quality:** додати автоматичні перевірки дозволених напрямків залежностей між шарами.
6. **P2 — Build quality gates:** винести Angular warning-gate в окремий CI job і зробити його блокуючим.

## 3) Що внесено в цій ітерації

- Оновлено `scripts/check-graphql-contract.sh`:
  - залишено перевірку базового негативного GraphQL-кейсу (невідоме поле);
  - додано негативний mutation-кейс `createComment` з невалідним payload;
  - додано перевірки `errors[0].extensions.code == BAD_USER_INPUT` та наявності `validationErrors`.
- Актуалізовано checklist: прибрано застаріле формулювання про «планується додати mutation-негативні кейси», зафіксовано фактичний поточний стан.

## 4) Що ще треба зробити у проєкті

- **P0 Messaging:** реалізувати MassTransit-інтеграцію (retry, DLQ, outbox, idempotency).
- **P1 Search:** перевести Elasticsearch на офіційний .NET client та описати typed index mapping/templates.
- **P1 Frontend:** додати e2e сценарії search/list/thread (debounce, URL-sync, paging/sort, retry UX).
- **P1 GraphQL:** додати окремі негативні контрактні кейси для `addReply`/невалідного `parentId` та зафіксувати snapshot error-contract.
- **P2 Architecture:** впровадити автоматичну перевірку правил залежностей між шарами.
- **P2 Build quality:** зробити Angular warning-check обовʼязковим у CI.
