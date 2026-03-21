# Dzen_public — детальний план пояснення коду (живий документ)

> Оновлено: 2026-03-21  
> Мета: дати готову «шпаргалку» для усного захисту/пояснення проєкту та фіксувати прогрес наших обговорень.

---

## 0) Як користуватися цим документом

- Розділи **1–8**: структуроване пояснення архітектури та стеку.
- Розділ **9**: «що вже пояснили / що ще лишилось» (живий трекер).
- Розділ **10**: що було упущено (додав як додаткові теми для захисту).

---

## 1) Опис структури проєкту в термінах OOP + патерни

### 1.1. Layered/Clean розбиття (по проєктах)

- `Comments.Domain` — чисті доменні сутності (ядро бізнес-моделі): `Comment`, `ProcessedMessage`.
- `Comments.Application` — use-case рівень: команди/запити, валідатори, DTO, сервіси, абстракції.
- `Comments.Infrastructure` — технічні адаптери: EF-репозиторії, MassTransit/RabbitMQ, Elasticsearch, SignalR, Captcha, файлова storage.
- `Comments.Api` — композиційний корінь (DI), REST/GraphQL endpoints, middleware, host.
- `Comments.Web` — Angular SPA (standalone components) + GraphQL client + RxJS state orchestration.

### 1.2. OOP/архітектурні патерни, які реально використані

1. **Repository**
   - Контракти в `Application` (`ICommentRepository`, `IProcessedMessageRepository`), реалізації в `Infrastructure` (`EfCommentRepository`, `EfProcessedMessageRepository`, `InMemoryCommentRepository`).
   - Навіщо: інкапсулює доступ до БД, дозволяє міняти persistence без зміни use-cases.

2. **CQRS (Command/Query Responsibility Segregation)**
   - `CreateCommentCommand`, `GetCommentsPageQuery`, `SearchCommentsQuery`, `GetCommentThreadQuery`, `PreviewCommentQuery` + відповідні handlers.
   - Навіщо: чіткий поділ write/read, прозора бізнес-навігація по коду.

3. **Mediator (MediatR)**
   - API/GraphQL відправляє запити через MediatR в handlers.
   - Навіщо: зменшує зв’язність між transport-шаром і конкретною бізнес-логікою.

4. **Pipeline/Decorator-подібний патерн (MediatR Behavior)**
   - `ValidationBehavior<,>` централізує валідацію перед виконанням handlers.
   - Навіщо: cross-cutting concern винесено з use-case коду.

5. **Adapter**
   - Інфраструктурні класи адаптують зовнішні технології під внутрішні абстракції:
     - `ElasticsearchCommentSearchService` / `ResilientCommentSearchService`;
     - `MassTransitCommentCreatedPublisher`;
     - `SignalRCommentCreatedChannel`;
     - `LocalAttachmentStorage`.

6. **Composite**
   - `CompositeCommentCreatedPublisher` агрегує декілька каналів публікації подій.
   - Навіщо: легко підключати/вимикати канали без зміни доменної логіки.

7. **Failover/Resilience Strategy**
   - `ResilientCommentSearchService` має fallback на репозиторний пошук, якщо Elasticsearch недоступний.

---

## 2) Коментарі в класах/методах/моделях

### Поточний стан

У значній частині backend/frontend коду вже є XML/JSDoc коментарі на класах, DTO, методах та ключових полях.

### Практика для повного покриття

Щоб «довести до ідеалу» пункт про коментарі, тримаємо правило:

- **Domain/Application/Infrastructure (C#):**
  - `/// <summary>` на кожному `class/record/interface`.
  - `///` на public методах та нетривіальних private helpers.
  - для DTO/record — `param`-коментарі.
- **Frontend (TS):**
  - JSDoc над сервісами, state-stream класами, публічними методами, важливими типами.

> Рекомендація для захисту: підкреслити, що коментарі тут не «замість коду», а як **архітектурна навігація** для рев’ю/оновлень.

---

## 3) Опис структури БД

Поточна схема (EF migration `202603180001_InitialMySqlSchema.cs`) включає:

1. **`Comments`**
   - `Id` (PK, `Guid`)
   - `ParentId` (FK -> `Comments.Id`, nullable) — для дерева вкладених коментарів
   - `UserName`, `Email`, `HomePage`
   - `Text`, `CreatedAtUtc`
   - поля вкладення: `AttachmentFileName`, `AttachmentContentType`, `AttachmentStoragePath`, `AttachmentSizeBytes`
   - індекс: `IX_Comments_ParentId`

2. **`ProcessedMessages`**
   - `Id` (PK, message id з брокера)
   - `ProcessedAtUtc`

Призначення `ProcessedMessages`: ідемпотентність consumers (щоб одне й те саме повідомлення RabbitMQ не оброблялось повторно як «нове»).

---

## 4) Напрям залежностей між шарами (Clean dependency rule)

Вимога і фактична реалізація:

- **Domain** не залежить від Application/Infrastructure/Api ✅
- **Application** не залежить від Infrastructure/Api ✅
- **Infrastructure** не залежить від Api ✅
- **Api** має прямі залежності на Application та Infrastructure ✅

Як це видно технічно:

- `Comments.Application.csproj` -> reference лише на `Comments.Domain`.
- `Comments.Infrastructure.csproj` -> reference на `Comments.Application` + `Comments.Domain`.
- `Comments.Api.csproj` -> reference на `Comments.Application` + `Comments.Domain` + `Comments.Infrastructure`.

---

## 5) Clean Architecture — що це і як застосовано тут

### 5.1. Коротко

Clean Architecture = бізнес-правила в центрі, а транспорт/БД/черги/мережа — зовнішні деталі.

### 5.2. У цьому проєкті

- **Центр:** `Domain` + `Application` (сутності, use-case логіка, контракти).
- **Зовнішнє кільце:** `Infrastructure` (EF, RabbitMQ, Elasticsearch, SignalR, files).
- **Найзовнішній шар:** `Api` + `Web` (HTTP/GraphQL/UI).
- Залежності направлені **всередину** через інтерфейси з `Application`.

Практичний ефект:
- легше тестувати use-cases із моками інтерфейсів;
- легше замінити технічну реалізацію (наприклад, іншу БД або чергу).

---

## 6) SOLID — де використано і чому

1. **S (Single Responsibility Principle)**
   - Окремі handlers під кожен use-case.
   - Окремі сервіси під конкретні задачі (search/publish/storage/captcha).

2. **O (Open/Closed Principle)**
   - Нові реалізації додаються через інтерфейси (наприклад, `ICommentSearchService`, `ICaptchaValidator`) без модифікації верхнього шару.

3. **L (Liskov Substitution Principle)**
   - Можна підставити `RepositoryCommentSearchService` замість Elasticsearch-реалізації (і навпаки) без поломки контракту.

4. **I (Interface Segregation Principle)**
   - Невеликі спеціалізовані контракти (`IAttachmentStorage`, `ITextSanitizer`, `ICommentCreatedChannel` тощо).

5. **D (Dependency Inversion Principle)**
   - `Application` працює з абстракціями, concrete реалізації реєструє `Api` в DI-контейнері.

---

## 7) Backend-бібліотеки: для чого і де у коді

1. **GraphQL (HotChocolate)**
   - Для гнучких query/mutation контрактів без over-fetching.
   - Де: `Comments.Api/GraphQL/*`, registration у `Program.cs` (`AddGraphQLServer`, `MapGraphQL("/graphql")`).

2. **CQRS + MediatR**
   - Для розділення read/write use-cases та єдиного entrypoint до handlers.
   - Де: `Comments.Application/Features/Comments/**`, registration у `Program.cs` (`AddMediatR`, `ValidationBehavior`).

3. **RabbitMQ (MassTransit)**
   - Асинхронні події (indexing/file processing), retry, consumer pipeline.
   - Де: `Comments.Infrastructure/Messaging/*`, registration та endpoints у `Program.cs`.

4. **Elasticsearch (офіційний .NET клієнт Elastic.Clients.Elasticsearch; за ТЗ — NEST/ES client)**
   - Повнотекстовий пошук і масштабований search read-model.
   - Де: `Comments.Infrastructure/Search/*`, `ElasticsearchClient` у `Program.cs`.

5. **SignalR**
   - Realtime доставка нових коментарів у SPA.
   - Де: `Comments.Infrastructure/Realtime/*`, endpoint `/hubs/comments` у `Program.cs`.

---

## 8) Frontend-бібліотеки: для чого і де у коді

1. **Angular (standalone components)**
   - SPA без full page reload, маршрути, компонентна композиція.
   - Де: `Comments.Web/src/app/pages/*`, `shared/*`, `app.config.ts` + `app.routes.ts`.

2. **Apollo Client (GraphQL) — у поточному коді роль GraphQL-клієнта виконує власний сервіс поверх `HttpClient`**
   - Призначення: виконання GraphQL query/mutation та обробка GraphQL errors.
   - Де: `core/comments-graphql-api.service.ts`, `core/comments-graphql-documents.ts`.
   - Важливе уточнення: з точки зору поточної реалізації це **не Apollo runtime**, а typed-wrapper на `HttpClient`.

3. **RxJS**
   - Реактивні потоки стану, retry/backoff, realtime merge, уніфікація lifecycle loading/error.
   - Де: `shared/comment-query-state/comment-query-state.stream.ts` + RxJS у page/shared компонентах.

---

## 9) План пояснень (що вже обговорено / що ще пояснити)

| Тема | Статус | Що саме покрити на наступному кроці |
|---|---|---|
| Архітектура шарів + dependency rule | ✅ Готово | Показати на `csproj` та DI-графі в `Program.cs`. |
| OOP-патерни в проєкті | ✅ Готово | Додати усний приклад «запит create -> handler -> service -> repo -> publish». |
| Структура БД | ✅ Готово | Окремо проговорити self-reference (`ParentId`) і `ProcessedMessages`. |
| Clean Architecture | ✅ Готово | Пояснити «чому бізнес не залежить від фреймворку». |
| SOLID з прикладами | ✅ Готово | Дати 1 кодовий приклад на кожний принцип. |
| Backend стек (GraphQL/CQRS/RabbitMQ/ES/SignalR) | ✅ Готово | Зафіксувати sequence diagram подій для create/search/realtime. |
| Frontend стек (Angular/GraphQL/RxJS) | ✅ Готово | Проговорити state-flow для list/thread/search. |
| Повний walkthrough одного E2E-сценарію | 🔄 В роботі | Крок за кроком: UI submit -> GraphQL -> handler -> repo -> MQ -> ES -> SignalR -> UI merge. |
| Нефункціональні вимоги (продуктивність/надійність/безпека) | ⏳ Заплановано | Додати окремий розділ з trade-offs і ризиками. |
| Test strategy та go/no-go | ⏳ Заплановано | Розкласти, які саме тести і що доводять при захисті. |

---

## 10) Що ще було упущено (додаю обов’язково для сильного пояснення)

1. **Де проходить транзакційна межа** при створенні коментаря (DB write синхронно, індексація асинхронно).
2. **Ідемпотентність consumer-ів** (`ProcessedMessages`) і чому це важливо при retry/delivery-at-least-once.
3. **Fallback стратегія пошуку** (Elasticsearch down -> repository search).
4. **Єдиний формат валідаційних помилок** для REST/GraphQL і як це спрощує UI.
5. **Санітизація XHTML + валідація вкладень** як частина security story.
6. **Observability/readiness**: `/health`, qa/go-no-go скрипти, артефакти handoff.
7. **Технічний борг / roadmap**: де є scaffold/опціональні елементи і що треба добити до production.

---

## 11) Пропозиція наступного кроку

Якщо ок — наступним кроком я зроблю **другий документ**:  
`docs/code-walkthrough-create-comment.md` з дуже детальним «по рядках» розбором одного наскрізного сценарію (від UI до БД/MQ/SignalR).

