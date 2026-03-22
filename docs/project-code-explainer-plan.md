# Dzen_public — детальний план пояснення коду (живий документ)

> Оновлено: 2026-03-22  
> Мета: підготувати «шпаргалку» для пояснення проєкту на захисті + фіксувати, що вже розібрали і що ще треба закрити.

---

## 0) Як користуватися цим документом

- Розділи **1–8**: архітектурний «скелет» пояснення (OOP/Clean/SOLID/стек).
- Розділ **9**: живий прогрес-трекер «вже пояснили / ще пояснити».
- Розділ **10**: що було упущено та додано в план.
- Розділ **11**: покроковий план наступних сесій пояснення (щоб ми поступово закрили всі теми).
- Розділ **12**: журнал наших обговорень (короткі записи, що саме вже проговорили).

- Розділ **13**: мапа реалізації Junior+ (Queue / Cache / Events / WebSocket) з конкретними класами.
- Розділ **14**: пропозиція наступного документа.
- Розділ **15**: карта файлів для детального технічного пояснення (новий deep-dive документ).

---

## 1) Опис структури проєкту в термінах OOP + патерни

### 1.1 Layered/Clean розбиття (по проєктах)

- `Comments.Domain` — ядро бізнес-моделі: `Comment`, `ProcessedMessage`, інваріанти.
- `Comments.Application` — use-case рівень: CQRS-команди/запити, валідатори, DTO, абстракції, сервіси.
- `Comments.Infrastructure` — технічні адаптери: EF-репозиторії, RabbitMQ/MassTransit, Elasticsearch, SignalR, Captcha, storage.
- `Comments.Api` — composition root: DI, REST/GraphQL маршрути, middleware, startup-host.
- `Comments.Web` — Angular SPA (standalone components) + GraphQL client layer + RxJS state/flows.

### 1.2 OOP/архітектурні патерни, які реально використані в коді

1. **Repository**  
   Контракти у `Application` (`ICommentRepository`, `IProcessedMessageRepository`), реалізації у `Infrastructure` (`EfCommentRepository`, `EfProcessedMessageRepository`, `InMemoryCommentRepository`).

2. **CQRS**  
   Розділення write/read через `CreateCommentCommand`, `GetCommentsPageQuery`, `SearchCommentsQuery`, `GetCommentThreadQuery`, `PreviewCommentQuery`.

3. **Mediator (MediatR)**  
   API/GraphQL не знає про конкретні реалізації use-cases, а шле їх через MediatR.

4. **Pipeline behavior (decorator-like)**  
   `ValidationBehavior<,>` централізовано виконує FluentValidation для всіх command/query.

5. **Adapter**  
   Інфраструктурні сервіси адаптують зовнішні системи до внутрішніх інтерфейсів (`ElasticsearchCommentSearchService`, `MassTransitCommentCreatedPublisher`, `SignalRCommentCreatedChannel`, `LocalAttachmentStorage`).

6. **Composite**  
   `CompositeCommentCreatedPublisher` публікує подію відразу в декілька каналів (`ICommentCreatedChannel`).

7. **Resilience/Fallback strategy**  
   `ResilientCommentSearchService` переходить на репозиторний пошук при проблемах Elasticsearch.

---

## 2) Коментарі у класах/методах/моделях

### 2.1 Поточний стан

- У ключових частинах коду вже є XML/JSDoc-коментарі (особливо в `Application`, `Infrastructure`, `Comments.Web/core`).
- Але пункт «у всі класи/методи/моделі» ще треба закривати системно (суцільним проходом).

### 2.2 Як добиваємо 100% покриття коментарями

- **Backend (C#):**
  - `/// <summary>` для кожного `public class/interface/record/enum`;
  - `///` для всіх `public` методів і складних `private` helper-методів;
  - `/// <param>` та `/// <returns>` для нетривіальних API.
- **Frontend (TS):**
  - JSDoc над сервісами, state-stream класами, фасадами;
  - короткі коментарі на критичних RxJS pipeline-ділянках;
  - коментарі на типах payload для GraphQL/UI-моделей.

### 2.3 Робочий checklist по коментарях (додано)

- [ ] Domain: перевірити всі сутності і domain-методи.
- [ ] Application: перевірити всі `Features/*` (handlers/validators/contracts).
- [ ] Infrastructure: перевірити всі адаптери (Search/Messaging/Storage/Realtime/Captcha).
- [ ] Api: перевірити controllers/graphql/error filters/program-level хелпери.
- [ ] Web: перевірити `core`, `pages`, `shared` (особливо `comment-form` та `comment-query-state`).

---

## 3) Опис структури БД

Поточна схема з EF migration `202603180001_InitialMySqlSchema.cs`:

1. **`Comments`**
   - `Id` (PK, `Guid`)
   - `ParentId` (FK -> `Comments.Id`, nullable) — дерево відповідей
   - `UserName`, `Email`, `HomePage`
   - `Text`, `CreatedAtUtc`
   - `AttachmentFileName`, `AttachmentContentType`, `AttachmentStoragePath`, `AttachmentSizeBytes`
   - індекс `IX_Comments_ParentId`

2. **`ProcessedMessages`**
   - `Id` (PK)
   - `ProcessedAtUtc`

`ProcessedMessages` = журнал ідемпотентності для consumer-ів RabbitMQ (захист від повторної обробки).

---

## 4) Напрям залежностей між шарами (dependency rule)

Ціль і фактична реалізація:

- **Domain** не залежить від Application/Infrastructure/Api ✅
- **Application** не залежить від Infrastructure/Api ✅
- **Infrastructure** не залежить від Api ✅
- **Api** залежить від Application + Infrastructure ✅

Підтвердження у `.csproj`:

- `Comments.Application.csproj` -> лише `Comments.Domain`.
- `Comments.Infrastructure.csproj` -> `Comments.Application` + `Comments.Domain`.
- `Comments.Api.csproj` -> `Comments.Application` + `Comments.Domain` + `Comments.Infrastructure`.

---

## 5) Що таке Clean Architecture і як вона застосована тут

- Бізнес-правила в центрі (`Domain` + `Application`).
- Технічні деталі на периферії (`Infrastructure`, далі `Api/Web`).
- Залежності йдуть «всередину» через абстракції.

Як це проявляється у проєкті:

- use-cases не знають про EF/HTTP/RabbitMQ/SignalR;
- інфраструктура підключається через DI в `Program.cs`;
- можлива заміна реалізацій без переписування бізнес-коду (наприклад, пошук).

---

## 6) SOLID — де, як і чому

1. **S — Single Responsibility**  
   Окремі handler-и для окремих use-cases; окремі адаптери під пошук/публікацію/сторедж.

2. **O — Open/Closed**  
   Розширення через нові реалізації інтерфейсів без модифікації ядра.

3. **L — Liskov Substitution**  
   `ICommentSearchService` дозволяє безпечно підставляти fallback/ES реалізації.

4. **I — Interface Segregation**  
   Маленькі інтерфейси (`ICaptchaValidator`, `IAttachmentStorage`, `ICommentCreatedChannel`, ...).

5. **D — Dependency Inversion**  
   Залежність від абстракцій у `Application`, реальні реалізації — у `Infrastructure`, wiring — у `Api`.

---

## 7) Backend бібліотеки: роль + де використані

1. **GraphQL (HotChocolate)**
   - Для гнучких query/mutation контрактів (мінімізація over-fetching).
   - `Comments.Api/GraphQL/*`, реєстрація в `Program.cs` (`AddGraphQLServer`, `MapGraphQL("/graphql")`).

2. **CQRS + MediatR**
   - Розділення read/write сценаріїв.
   - `Comments.Application/Features/Comments/*`, `AddMediatR` в `Program.cs`.

3. **RabbitMQ + MassTransit**
   - Асинхронні події, retry, consumer pipeline, ідемпотентність.
   - `Comments.Infrastructure/Messaging/*`, конфіг bus/consumers у `Program.cs`.

4. **Elasticsearch (Elastic.Clients.Elasticsearch; за ТЗ згадується NEST/ES-клієнт)**
   - Повнотекстовий пошук + індексація.
   - `Comments.Infrastructure/Search/*`, `ElasticsearchClient` реєструється у `Program.cs`.

5. **SignalR**
   - Realtime доставка нових коментарів у SPA.
   - `Comments.Infrastructure/Realtime/*`, endpoint `/hubs/comments` у `Program.cs`.

---

## 8) Frontend бібліотеки: роль + де використані

1. **Angular (standalone components)**
   - SPA без full reload, сторінки root/thread, компоненти shared.
   - `Comments.Web/src/app/pages/*`, `shared/*`, `app.config.ts`, `app.routes.ts`.

2. **Apollo Client (GraphQL)**
   - Пакети підключені (`@apollo/client`, `apollo-angular`) для GraphQL-екосистеми.
   - У поточній реалізації основний runtime-клієнт — власний wrapper-сервіс на `HttpClient`:
     `core/comments-graphql-api.service.ts` + `comments-graphql-documents.ts`.

3. **RxJS**
   - Реактивні pipeline для loading/error/retry/realtime merge/state transitions.
   - `shared/comment-query-state/comment-query-state.stream.ts` + page/shared фасади.

---

## 9) План пояснень (що вже обговорено / що ще пояснити)

| Тема | Статус | Що покриваємо далі |
|---|---|---|
| Архітектура шарів + dependency rule | ✅ Готово | Додати діаграму стрілок залежностей у окремому doc. |
| OOP-патерни | ✅ Готово | Підкріпити прикладом одного end-to-end сценарію. |
| Структура БД | ✅ Готово | Пояснити дерево коментарів і каскадне відображення в UI. |
| Clean Architecture | ✅ Готово | Проговорити аргументи «чому це зручно тестувати/масштабувати». |
| SOLID з прикладами | ✅ Готово | Дати по 1–2 конкретних класи на кожен принцип. |
| Backend стек | ✅ Готово | Sequence-flow для create/search/realtime винесено в `code-walkthrough-create-comment.md` + `code-walkthrough-search-resilience.md`. |
| Frontend стек | ✅ Готово | Показати data-flow `component -> facade -> api -> stream`. |
| Коментарі в усіх класах/методах | 🔄 В роботі | Domain/Application sweep закрито, залишились Infrastructure/Api/Web (див. чеклист 2.3). |
| Нефункціональні вимоги | ⏳ Заплановано | Описати reliability/performance/security trade-offs. |
| Test strategy + evidence | ⏳ Заплановано | Зібрати «які тести що доводять» для захисту. |

---

## 10) Що було упущено і додано в план

1. Транзакційна межа create-comment (sync DB write + async side-effects).
2. Ідемпотентність споживачів через `ProcessedMessages`.
3. Fallback поведінка пошуку (ES unavailable -> repository).
4. Уніфікація валідаційних помилок (REST + GraphQL).
5. Security-історія: sanitizer, captcha, обмеження вкладень.
6. Readiness/операційні скрипти (`/health`, qa/go-no-go).
7. Відмінність «за ТЗ Apollo» vs «поточна реалізація через HttpClient-wrapper».
8. Зіставлення ТЗ/README/checklist, щоб на захисті пояснювати можливі різниці коректно.

---

## 11) Наступні кроки (план сесій пояснення)

### Сесія A — повний walkthrough create comment (UI -> API -> DB -> MQ -> SignalR)
- [x] Розібрати `comment-form` стан у frontend.
- [x] Показати GraphQL mutation і маппінг помилок.
- [x] Пройти `CreateCommentCommandHandler` + validator.
- [x] Показати EF save + publish канали + realtime update.
- [x] Підготувати окремий сценарний документ `docs/code-walkthrough-create-comment.md`.

### Сесія B — search flow + resilience
- [x] Пояснити `SearchCommentsQueryHandler`.
- [x] Пояснити `ResilientCommentSearchService`.
- [x] Показати, що відбувається при недоступному Elasticsearch.
- [x] Підготувати окремий сценарний документ `docs/code-walkthrough-search-resilience.md`.

### Сесія C — DB + data consistency
- [ ] Розібрати EF migration і зв’язки.
- [ ] Розібрати idempotency (`ProcessedMessages`).
- [ ] Пояснити eventual consistency (DB vs Search index).

### Сесія D — clean architecture + SOLID захист
- [ ] Підготувати «коротку промову на 3–5 хв».
- [ ] Додати таблицю: «принцип -> кодовий приклад -> користь».
- [ ] Підготувати відповіді на типові питання рев’юера.

---

## 12) Журнал обговорень (оновлюємо після кожної сесії)

### 2026-03-22 — сесія #4 (виконано)

**Обговорили/додали:**
- підготовлено окремий сценарний документ `docs/code-walkthrough-search-resilience.md` з E2E flow для search (frontend -> GraphQL/REST -> MediatR -> resilient search service -> ES/fallback);
- закрили сесію B із секції 11 (усі 3 пункти + артефакт для презентації);
- зафіксували логіку degraded mode: при збоях Elasticsearch пошук переходить на repository-level реалізацію зі стабільним DTO-контрактом;
- додали блок «типові питання комісії + короткі відповіді» саме по search resilience.

**Що залишилось:**
- сесія C: підготувати короткий блок про eventual consistency і idempotency з прикладами race-condition;
- сесія D: звести «SOLID -> конкретний клас -> користь» у готовий виступ на 3–5 хв.

---

### 2026-03-22 — сесія #3 (виконано)

**Обговорили/додали:**
- підготовлено окремий сценарний документ `docs/code-walkthrough-create-comment.md` з E2E flow (frontend -> GraphQL -> MediatR -> EF -> event fan-out -> MQ/SignalR/ES);
- закрили сесію A із секції 11 (усі 4 пункти + артефакт для презентації);
- уточнили, як пояснювати transaction boundary: commit у БД синхронно, side-effects через канали подій та черги асинхронно;
- додали блок «типові питання комісії + короткі відповіді» у walkthrough-документ.

**Що залишилось:**
- сесія B: деталізувати resilience для search (happy path + degraded mode);
- сесія C: підготувати короткий блок про eventual consistency і idempotency з прикладами race-condition;
- сесія D: звести «SOLID -> конкретний клас -> користь» у готовий виступ на 3–5 хв.

---

### 2026-03-22 — сесія #2 (виконано)

**Обговорили/додали:**
- підготовлено deep-dive документ `docs/project-code-explainer-deep-dive.md` з детальним walkthrough по шарах і бібліотеках;
- винесено окремий backlog для вимоги «коментарі у всі класи/методи/моделі» (поетапний план без хаотичних правок);
- додано список питань, які найчастіше задають на захисті (transaction boundary, eventual consistency, fallback, validation contract).

**Що залишилось:**
- заповнити file-by-file таблицю «клас -> відповідальність -> залежності -> що питати на захисті»;
- пройтись по XML/JSDoc коментарях у коді фактичними комітами;

---

## 13) Junior+ блок: де саме реалізовано Queue / Cache / Events / WS

### 13.1 Queue (черги)

**Де в коді:**
- `Comments.Api/Program.cs` — конфігурує MassTransit + RabbitMQ transport, receive-endpoints для черг `indexing` і `file-processing`, retry + outbox, та прив’язує consumer-и.
- `Comments.Infrastructure/Messaging/RabbitMqOptions.cs` — централізовані назви exchange/queue/DLQ.
- `Comments.Infrastructure/Messaging/Consumers/IndexCommentCreatedConsumer.cs` — читає подію створення коментаря з queue і оновлює пошуковий індекс.
- `Comments.Infrastructure/Messaging/Consumers/FileProcessingCommentCreatedConsumer.cs` — окремий consumer під file-processing сценарій.
- `Comments.Infrastructure/Persistence/EfProcessedMessageRepository.cs` + `Comments.Domain/Entities/ProcessedMessage.cs` — idempotency журнал, щоб повторне доставлення message не ламало консистентність.

**Для чого:**
- асинхронно винести важкі/інтеграційні side-effects із HTTP/GraphQL request path;
- ізолювати пікові навантаження (черга «вирівнює» burst);
- гарантувати retry/DLQ-обробку та операційну керованість.

### 13.2 Events (події)

**Де в коді:**
- `Comments.Application/Abstractions/ICommentCreatedChannel.cs` — контракт «каналу події».
- `Comments.Infrastructure/Messaging/CompositeCommentCreatedPublisher.cs` — fan-out: шле одну подію в кілька каналів.
- `Comments.Infrastructure/Messaging/MassTransitCommentCreatedPublisher.cs` — публікація `CommentCreatedMessage` у шину.
- `Comments.Infrastructure/Realtime/SignalRCommentCreatedChannel.cs` — подія в realtime-клієнтів.
- `Comments.Infrastructure/Search/ElasticsearchCommentCreatedChannel.cs` — подія в індексатор Elasticsearch.
- `Comments.Application/Features/Comments/Commands/CreateComment/CreateCommentCommandHandler.cs` — місце, де після успішного save запускається publish події.

**Для чого:**
- розв’язати coupling між «створили коментар» і downstream-процесами;
- додавати нові реакції на подію без переписування core use-case;
- тримати write-path швидким, а інтеграції — асинхронними.

### 13.3 WebSocket (WS) / SignalR

**Де в коді:**
- `Comments.Infrastructure/Realtime/CommentsHub.cs` — SignalR hub.
- `Comments.Api/Program.cs` — `AddSignalR()` та `MapHub<CommentsHub>("/hubs/comments")`.
- `Comments.Infrastructure/Realtime/SignalRCommentCreatedChannel.cs` — серверний publisher події `commentCreated`.
- `Comments.Web/src/app/pages/root-list/root-list-page.component.ts` — клієнтська SignalR-підписка і merge нових коментарів у root-list.
- `Comments.Web/src/app/pages/thread/thread-page.component.ts` — клієнтська SignalR-підписка для thread view.

**Для чого:**
- push-оновлення без polling;
- менша затримка появи нових коментарів в UI;
- кращий UX при одночасній роботі кількох користувачів/вкладок.

### 13.4 Cache (кеш)

**Що вже є:**
- `Comments.Api/Program.cs` — підключено `AddMemoryCache()`.
- `Comments.Infrastructure/Captcha/BasicCaptchaChallengeStore.cs` — `IMemoryCache` для короткоживучих captcha challenge (TTL + one-time verify).
- `Comments.Infrastructure/Captcha/CaptchaChallengeService.cs` — створює challenge і опирається на cache-backed store.

**Для чого:**
- швидка тимчасова перевірка captcha без постійного походу в БД;
- зменшення latency та простий анти-бот механізм.

**Що варто підсилити, щоб формально «закрити» Junior+ cache-шар:**
- винести cache в окремий application-level контракт (напр. `ICommentReadCache`);
- додати distributed backend (`IDistributedCache`/Redis) для read-heavy сценаріїв (root list, thread snapshot, anti-spam lookup);
- описати cache policy (TTL, invalidation on create/reply, fallback при cache miss).
- зафіксувати розбіжності між ТЗ і реалізацією у форматі «вимога -> статус -> аргументація».

---

### 2026-03-21 — сесія #1 (виконано)

**Обговорили:**
- загальну структуру шарів;
- dependency rule між Domain/Application/Infrastructure/Api;
- OOP-патерни (Repository, CQRS, Mediator, Adapter, Composite, Fallback);
- БД (Comments + ProcessedMessages);
- роль ключових backend/frontend бібліотек;
- початковий список тем, які були упущені.

**Залишилось детально розібрати:**
- наскрізний сценарій create comment по файлах;
- системний проход по коментарях у всіх класах/методах;
- test evidence + operational/readiness story для захисту.

---

## 14) Пропозиція наступного документа

Після цього плану логічний наступний артефакт:  
`docs/code-walkthrough-create-comment.md` — «по кроках» розбір create-comment E2E сценарію (від фронту до persistence/realtime/indexing). ✅ Підготовлено.

Додатково для search-resilience підготовлено:  
`docs/code-walkthrough-search-resilience.md` — «по кроках» розбір пошуку з fallback-механікою при недоступному Elasticsearch. ✅ Підготовлено.


## 15) Новий документ для детального пояснення коду

- Додано: `docs/project-code-explainer-deep-dive.md`.
- Призначення: «опорний конспект» для усної презентації коду (архітектура, патерни, бібліотеки, dependency rule, DB, SOLID, список питань від рев’юера, backlog на коментарі в коді).
- Як використовувати разом із цим планом:
  1. цей файл (`project-code-explainer-plan.md`) — трекер прогресу;
  2. deep-dive файл — змістовна база для пояснення;
  3. після кожної сесії оновлюємо секцію 12 + чеклисти в секції 9/11.
