# Dzen_public — deep-dive пояснення коду для захисту

> Оновлено: 2026-03-22  
> Призначення: практичний «конспект доповідача», який можна майже дослівно використати на презентації/захисті.

---

## 0) Навігація по walkthrough-документах

- `docs/code-walkthrough-create-comment.md` — наскрізний flow створення коментаря.
- `docs/code-walkthrough-search-resilience.md` — пошук + degraded mode/fallback при збоях Elasticsearch.
- `docs/code-walkthrough-db-consistency.md` — транзакційна межа, idempotency, eventual consistency.

> Рекомендація для виступу: брати цей deep-dive як «основу», а walkthrough-файли — як сценарні вставки під конкретні питання комісії.

---

## 1) Архітектурна мапа: як коротко пояснити весь проєкт

Проєкт побудований за **Clean Architecture** з шаровим поділом:

- **Domain**: бізнес-сутності та інваріанти (`Comment`, `ProcessedMessage`).
- **Application**: сценарії (use-cases) через CQRS (команди/запити), DTO, валідацію, інтерфейси.
- **Infrastructure**: реалізації інтерфейсів Application (EF, RabbitMQ, Elasticsearch, SignalR, CAPTCHA, файлове сховище).
- **Api**: composition root і транспортний шар (REST + GraphQL + middleware + DI wiring).
- **Web**: Angular SPA (standalone components), state/flow на RxJS, GraphQL-виклики.

### Головна ідея для пояснення

> Бізнес-логіка залежить від абстракцій, а зовнішні технології підключені як адаптери. Це дає замінність, тестованість і контроль складності.

---

## 2) OOP і патерни: що називати на захисті

### 2.1 Repository

- Інтерфейси в `Application`: `ICommentRepository`, `IProcessedMessageRepository`.
- Реалізації в `Infrastructure`: `EfCommentRepository`, `EfProcessedMessageRepository`, `InMemoryCommentRepository`.
- Користь: Application не залежить від конкретної БД/ORM.

### 2.2 CQRS + Mediator

- Команди: `CreateCommentCommand`.
- Запити: `GetCommentsPageQuery`, `GetCommentThreadQuery`, `SearchCommentsQuery`, `PreviewCommentQuery`.
- Обробники (handlers) ізольовано реалізують один use-case.
- `MediatR` розв’язує API-шар від прямої залежності на конкретний сервіс.

### 2.3 Pipeline / Decorator-подібний патерн

- `ValidationBehavior<,>` перехоплює всі MediatR-запити і виконує FluentValidation централізовано.
- Користь: валідація не дублюється в контролерах/GraphQL resolver-ах.

### 2.4 Adapter

- `ElasticsearchCommentSearchService`, `MassTransitCommentCreatedPublisher`, `SignalRCommentCreatedChannel`, `LocalAttachmentStorage`, `RecaptchaCaptchaValidator`.
- Користь: будь-який зовнішній SDK «ізольований» у своїй реалізації інтерфейсу.

### 2.5 Composite

- `CompositeCommentCreatedPublisher` розсилає подію в кілька каналів (напр., MassTransit + SignalR channel pipeline).

### 2.6 Strategy / Fallback

- `ResilientCommentSearchService`: якщо Elasticsearch недоступний — fallback на репозиторний пошук (`RepositoryCommentSearchService`).

---

## 3) Dependency Rule (напрям залежностей)

Цільове правило і фактична реалізація:

- **Domain** — не залежить від Application/Infrastructure/Api.
- **Application** — не залежить від Infrastructure/Api.
- **Infrastructure** — не залежить від Api.
- **Api** — залежить від Application + Infrastructure.

Це виконує головне правило Clean Architecture: залежності спрямовані до внутрішніх шарів (через абстракції).

---

## 4) Backend: покроково «що за що відповідає»

## 4.1 `Comments.Domain`

### `Comment`

- Основна сутність коментаря (автор, email, текст, батьківський коментар, attachment metadata, дата створення).
- Підтримує дерево відповідей через `ParentId`.

### `ProcessedMessage`

- Сутність для ідемпотентності обробки message/event.
- Використовується consumer-ами, щоб не виконувати повторну обробку того самого повідомлення.

## 4.2 `Comments.Application`

### Abstractions

- Контракти для залежностей на зовнішні сервіси: репозиторії, CAPTCHA, search, storage, publisher/channel тощо.

### Features/Comments/Commands

- `CreateCommentCommand` + validator + handler.
- Handler:
  1) валідує/нормалізує вхід;
  2) санітизує текст;
  3) зберігає у репозиторій;
  4) ініціює асинхронні side-effects (publish/new-comment channel).

### Features/Comments/Queries

- `GetCommentsPageQuery`: root list із пагінацією/сортуванням/фільтрами.
- `GetCommentThreadQuery`: конкретна гілка дерева коментарів.
- `SearchCommentsQuery`: пошуковий use-case.
- `PreviewCommentQuery`: preview-перетворення/санітизація перед відправкою.

### Common/Behaviors

- `ValidationBehavior<,>` — єдина точка виконання FluentValidation.

## 4.3 `Comments.Infrastructure`

### Persistence

- `CommentsDbContext`: EF-модель, мапінг таблиць.
- `EfCommentRepository`, `EfProcessedMessageRepository`: реалізація збереження.

### Search

- `ElasticsearchCommentSearchService`: робота з ES-клієнтом.
- `ElasticsearchIndexInitializerHostedService`: ініціалізація індексу.
- `ElasticsearchBackfillHostedService`: заповнення індексу з БД.
- `ResilientCommentSearchService`: fallback-поведінка.

### Messaging

- `MassTransitCommentCreatedPublisher`: публікація подій у RabbitMQ через MassTransit.
- `CommentIndexingRequestedConsumer`, `CommentFileProcessingRequestedConsumer`: consumers фонової обробки.
- `CompositeCommentCreatedPublisher`: мультиканальна публікація.

### Realtime

- `CommentsHub`: SignalR hub.
- `SignalRCommentCreatedChannel`: доставка нових коментарів у realtime-підписників.

### Captcha / Text / Storage

- `RecaptchaCaptchaValidator`, `BasicCaptchaValidator`: перевірка captcha token/challenge.
- `BasicTextSanitizer`: захист від небезпечного HTML/XSS-вводу.
- `LocalAttachmentStorage`: локальне збереження вкладень + перевірки типів/розмірів.

## 4.4 `Comments.Api`

### `Program.cs`

- Головний composition root: DI, GraphQL, REST, SignalR endpoints, MassTransit, ES-клієнт, middleware, health-check-style конфіг.

### GraphQL

- `CommentQueries`, `CommentMutations` + input/error filters.
- Переклад валідаційних помилок у зрозумілий GraphQL error contract (`BAD_USER_INPUT`).

### REST Controllers

- `CommentsController`, `CaptchaController` — HTTP entrypoints для SPA.

---

## 5) Frontend (Angular) — як пояснювати

## 5.1 Архітектурний поділ

- `core/` — API layer, моделі, документи GraphQL, обробка помилок.
- `pages/` — контейнери сторінок (`root-list`, `thread`).
- `shared/` — перевикористовувані UI+state компоненти (tree, form, preview, realtime merge, attachments, toolbar).

## 5.2 Ключові бібліотеки

- **Angular standalone components**: легша модульність без обов’язкових NgModule для кожного блоку.
- **Apollo Client (GraphQL екосистема)**: в проєкті встановлені відповідні пакети, а runtime-виклик наразі централізований у власному API-wrapper сервісі.
- **RxJS**: всі async state-потоки (loading/error/retry/realtime) реалізовані реактивно.

## 5.3 Потік даних (для презентації)

`Component -> facade/state stream -> core api service -> /graphql або REST -> response/error mapping -> UI update`.

---

## 6) Структура БД (факт по міграції)

Основна міграція: `202603180001_InitialMySqlSchema`.

### Таблиця `Comments`

- `Id` (PK, GUID)
- `ParentId` (nullable FK -> Comments.Id)
- `UserName`, `Email`, `HomePage`
- `Text`, `CreatedAtUtc`
- `AttachmentFileName`, `AttachmentContentType`, `AttachmentStoragePath`, `AttachmentSizeBytes`
- індекс `IX_Comments_ParentId`

### Таблиця `ProcessedMessages`

- `Id` (PK)
- `ProcessedAtUtc`

Призначення: захист від повторної обробки RabbitMQ-повідомлень (idempotency).

---

## 7) SOLID — де в коді

- **S (SRP):** окремі handlers/validators/services на кожен use-case.
- **O (OCP):** розширення через нові реалізації інтерфейсів без переписування Application.
- **L (LSP):** замінність реалізацій `ICommentSearchService`/`ICaptchaValidator` без зміни клієнтського коду.
- **I (ISP):** малі цільові контракти (`IAttachmentStorage`, `ICommentCreatedChannel`, ...).
- **D (DIP):** Application працює з абстракціями, concrete реалізації в Infrastructure, wiring у Api.

---

## 8) Що ще часто питають на захисті (і що варто підготувати)

1. **Чому тут саме Clean Architecture, а не просто 3-layer CRUD?**
   - Бо є асинхронні інтеграції (MQ, ES, SignalR), і ізоляція інфраструктури критична.

2. **Де транзакційна межа?**
   - Синхронна частина: запис у БД; асинхронна частина: індексація/паблішинг/realtime (eventual consistency).

3. **Що буде, якщо Elasticsearch впаде?**
   - `ResilientCommentSearchService` має fallback на БД-рівень.

4. **Як обробляються валідаційні помилки у REST/GraphQL?**
   - Через unified mapping (ValidationProblemDetails / GraphQL `validationErrors`).

5. **Як забезпечується безпека вводу?**
   - CAPTCHA + sanitizer + валідація whitelist для вкладень/форматів.

---

## 9) Технічний backlog пояснення (чеклист)

### Обов’язково дорозповісти

- [x] Наскрізний сценарій: `create comment` від Angular форми до DB + MQ + SignalR (`docs/code-walkthrough-create-comment.md`).
- [x] Наскрізний сценарій: `search` з fallback при ES outage (`docs/code-walkthrough-search-resilience.md`).
- [ ] Таблиця «SOLID принцип -> конкретний файл -> користь».
- [ ] Таблиця «бібліотека -> навіщо -> де підключається -> де викликається».
- [ ] Пояснення різниці між вимогами базового ТЗ і фактичною реалізацією репозиторію.

### Рекомендовано додати

- [ ] Діаграми sequence (create/search/realtime).
- [ ] FAQ з 15-20 типових питань від рев’юера.
- [ ] Окремий doc «Glossary» (CQRS, eventual consistency, idempotency, composition root, adapter).

---

## 10) План коментарів у коді (поетапно, без хаосу)

> Це план для вимоги «коментарі у всі класи/методи/моделі». Робимо ітеративно.

### Етап 1 (Domain + Application Contracts)

- [ ] Додати/вирівняти XML summary для всіх `public` типів у `Domain`.
- [ ] Додати XML summary на `Application/Abstractions/*`.

### Етап 2 (Application Features)

- [ ] Commands/Queries: summary + param/returns, де доречно.
- [ ] Handlers: короткі коментарі на кожному логічному кроці use-case.
- [ ] Validators: явне пояснення business rule для кожного rule-set.

### Етап 3 (Infrastructure)

- [ ] Search/Messaging/Realtime/Storage/Captcha/Persistence — summary для класів і ключових методів.
- [ ] Hosted services: задокументувати lifecycle і retry/fallback.

### Етап 4 (Api + Web)

- [ ] Controllers/GraphQL types/error filters/Program wiring.
- [ ] Angular core/services/state-streams/shared-components (JSDoc).

Критерій done:
- немає «німих» публічних класів/методів у backend;
- у frontend пояснені всі state-менеджери, фасади, і нетривіальні RxJS pipeline.
