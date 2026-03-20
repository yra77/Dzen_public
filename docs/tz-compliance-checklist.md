# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-20 (ітерація masstransit-elastic-official-client).

> Документ містить лише актуальний стан реалізації, поточний план і найближчі кроки.

## 1) Матриця відповідності ТЗ (актуально)

### Backend

| Вимога ТЗ | Статус | Поточний стан у репозиторії | Що робимо далі |
|---|---|---|---|
| ASP.NET Core 8.0 (LTS) | ✅ Виконано | Усі backend-проєкти таргетують `net8.0`. | Підтримувати patch-оновлення .NET 8. |
| Entity Framework Core + SQLite | ✅ Виконано | Для `Persistence:Provider=Sqlite` використовується `UseSqlite(...)`, на старті застосовуються міграції. | Підтримувати консистентність SQLite-міграцій. |
| GraphQL (HotChocolate) | ✅ Виконується за планом | Працює endpoint `/graphql`; CI перевіряє root query/mutation поля, негативний invalid field case, негативний `createComment` (`BAD_USER_INPUT` + `validationErrors`) і негативний `addReply` для неіснуючого `parentId`. | Зафіксувати snapshot-контракт для помилок `addReply`, щоб стабілізувати `extensions` для бізнес-помилок. |
| CQRS + MediatR | ✅ Виконано | Команди/запити реалізовані в `Comments.Application`, валідація підключена через `ValidationBehavior`. | Додати e2e перевірки CQRS-сценаріїв. |
| RabbitMQ (MassTransit) | ✅ Виконано | Інтеграція переведена на MassTransit + RabbitMQ transport; producer/consumer працюють через typed contracts, увімкнені retry + error queue (DLQ), in-memory outbox і idempotency через `ProcessedMessage`. | Додати окремі інтеграційні smoke-check сценарії для транспортного контуру. |
| Elasticsearch (офіційний .NET client) | ✅ Виконано | Search/indexing переведено на `Elastic.Clients.Elasticsearch`; додано typed document і стартовий index initializer з typed mapping, збережено resilient fallback на repository search. | Додати smoke-перевірку створення індексу та backfill у CI-оточенні з Elasticsearch. |
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

1. **P1 — Frontend/RxJS UX:** додати e2e покриття для search/list/thread flow (debounce + URL-sync + paging/sort + auto-retry).
2. **P1 — GraphQL quality:** зафіксувати snapshot-контракт `error.extensions` для бізнес-помилок `addReply`/`createComment`.
3. **P2 — Architecture quality:** додати автоматичні перевірки дозволених напрямків залежностей між шарами.
4. **P2 — Build quality gates:** винести Angular warning-gate в окремий CI job і зробити його блокуючим.

## 3) Що внесено в цій ітерації

- **RabbitMQ / MassTransit:**
  - замінено `RabbitMQ.Client` інтеграцію на MassTransit transport для RabbitMQ;
  - додано typed message contracts і окремі consumer-и для indexing/file-processing;
  - налаштовано retry policy, error queue (DLQ-поведінка за замовчуванням MassTransit), in-memory outbox;
  - збережено idempotency на стороні consumer-ів через `ProcessedMessageRepository`.
- **Elasticsearch / official .NET client:**
  - замінено low-level HTTP інтеграцію на `Elastic.Clients.Elasticsearch`;
  - додано typed документ `CommentSearchDocument`;
  - додано startup-initializer індексу з typed mapping;
  - збережено backfill на старті та resilient fallback до repository search.
- Актуалізовано checklist: прибрано неактуальні кроки «мігрувати на MassTransit» і «перейти на офіційний Elasticsearch client», оскільки ці роботи виконані в поточній ітерації.

## 4) Що ще треба зробити у проєкті

- **P1 Frontend:** додати e2e сценарії search/list/thread (debounce, URL-sync, paging/sort, retry UX).
- **P1 GraphQL:** стабілізувати unified error-contract (`error.extensions`) для бізнес-помилок, включно з `addReply`.
- **P2 Architecture:** впровадити автоматичну перевірку правил залежностей між шарами.
- **P2 Build quality:** зробити Angular warning-check обовʼязковим у CI.
