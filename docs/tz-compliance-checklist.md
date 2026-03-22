# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-22 (оновлено checklist, прибрано неактуальні пункти, додано статус по візуальному перегляду файлів).

> Документ синхронізовано з поточним станом репозиторію.

## 1) Швидкий висновок по відповідності

- **Архітектура і стек (ASP.NET Core 8, Angular standalone, GraphQL, CQRS/MediatR, RabbitMQ/MassTransit, Elasticsearch, SignalR)** — імплементовано.
- **Ключові UX-функції (nested replies, сортування, пагінація 25 за замовчуванням, preview, quick-tags, lightbox, realtime merge)** — імплементовано.
- **Перегляд файлів із візуальними ефектами** — імплементовано: image-вкладення відкривається в lightbox-діалозі з анімацією та затемненням фону.
- **Безпека вводу (валідація, CAPTCHA, санітизація XHTML, обмеження вкладень)** — імплементовано на рівні коду.
- **Схема БД:** `db-schema.mwb` відновлено і синхронізовано з EF-міграцією `202603180001_InitialMySqlSchema`.

## 2) Матриця відповідності вимогам (кодова перевірка)

### Backend

| Вимога | Статус | Доказ у коді | Що ще зробити |
|---|---|---|---|
| ASP.NET Core 8.0 (LTS) | ✅ | Проєкт API працює на .NET 8, програма сконфігурована через `WebApplication` + DI. | Тримати patch-релізи .NET 8 актуальними. |
| EF Core + SQLite | ✅ | Підключено `UseSqlite(...)`, нормалізація шляху БД, автозастосування міграцій при старті. | Додати інтеграційний тест на cold-start міграцій. |
| GraphQL (HotChocolate) | ✅ | Зареєстровані query/mutation типи, `ValidationExceptionErrorFilter`, `BusinessRuleExceptionErrorFilter`, endpoint `/graphql`. | Додати snapshot baseline для `errors[0].extensions`. |
| CQRS + MediatR | ✅ | Використано команди/запити та `ValidationBehavior<,>`. | Додати e2e для сценаріїв `createComment/addReply/search`. |
| RabbitMQ (MassTransit) | ✅ | Конфігурація transport, consumers, retry, outbox, idempotency (`ProcessedMessage`). | Додати окремий CI smoke для transport-контуру. |
| Elasticsearch | ✅ | Підключено офіційний `Elastic.Clients.Elasticsearch`, index initializer + backfill + resilient fallback. | Перевірка індексації в CI з піднятим Elasticsearch. |
| SignalR | ✅ | Hub `/hubs/comments`, канал публікації подій нових коментарів. | Додати reconnect/backoff e2e тест. |
| XSS/ін’єкції | ✅ Реалізовано на кодовому рівні | Серверний sanitizer XHTML (whitelist тегів/атрибутів, href only, без namespace-атрибутів), frontend-валидатор з такими ж правилами, escaped LIKE-пошук (без wildcard-injection). | Додати автоматизований security-regression suite як окремий артефакт QA. |

### Frontend

| Вимога | Статус | Доказ у коді | Що ще зробити |
|---|---|---|---|
| Angular standalone components | ✅ | Компоненти оголошені як `standalone`, SPA-маршрути працюють через root/thread pages. | Додати e2e smoke для всіх ключових маршрутів. |
| Apollo Client + GraphQL | ✅ | Використовується GraphQL API контракт + обробка GraphQL помилок у shared core-сервісах. | Додати e2e UX для `BAD_USER_INPUT`/retry. |
| Пагінація 25 за замовчуванням | ✅ | У query-моделях `PageSize = 25` за замовчуванням (REST/GraphQL шари), у UI додано footer-summary: `Всього`, `На цій сторінці`, `Вже переглянуто (page × 25)`. | Додати e2e-перевірку значень summary при переходах між сторінками. |
| Сортування root-коментарів | ✅ | Підтримано сортування за полями та напрямком; дефолт — `CreatedAtUtc Desc` (LIFO). | Додати e2e на всі комбінації sort-field/sort-direction. |
| Каскадні відповіді будь-якої глибини | ✅ (логіка дерева) | Self-reference у БД + рекурсивний merge у UI для replies. | Додати stress e2e на глибокі дерева. |
| Preview без перезавантаження | ✅ | Є окремий preview-flow/state для форми коментаря. | Додати e2e з перевіркою fallback-повідомлень. |
| Quick formatting `[i][strong][code][a]` | ✅ | Виділений `QuickTagsToolbarComponent` із потрібними тегами. | Додати keyboard-accessibility тест-кейси. |
| Lightbox для вкладень | ✅ | Додано модальний preview image-вкладень з анімацією, backdrop-ефектом і закриттям по кліку/кнопці. | Додати e2e перевірку відкриття/закриття lightbox + ESC. |
| Realtime оновлення (SignalR) | ✅ | Реалізовано realtime merge для root list + thread. | Додати сценарій втрати з’єднання/повторного підключення. |

### Вкладення та обмеження файлів

| Вимога | Статус | Доказ у коді | Що ще зробити |
|---|---|---|---|
| PNG/JPG/GIF + TXT | ✅ | Допустимі MIME-типи явно перелічені у валідаторі та storage. | Додати API contract test з недопустимим MIME. |
| TXT ≤ 100 KB | ✅ | Для `text/plain` є перевірка `MaxTextSizeBytes`. | Додати boundary-тести 100KB/100KB+1. |
| Image auto-resize до 320×240 | ✅ | `ResizeMode.Max` з `MaxImageWidth/MaxImageHeight` у storage normalization. | Додати інтеграційний test на великий image upload. |

## 3) Перевірка `db-schema.mwb` проти фактичної БД

- `db-schema.mwb` у корені репозиторію заповнено SQL DDL-артефактом.
- Артефакт синхронізований з EF Core міграцією `202603180001_InitialMySqlSchema`:
  - `Comments` (self-reference через `ParentId` + індекс `IX_Comments_ParentId`),
  - `ProcessedMessages` (idempotency журнал).

### Що обов’язково зробити

1. Розширити CI-перевірку: окрім non-empty, додати контроль синхронності артефакту з міграціями.

## 4) Що змінено в поточній ітерації (2026-03-22)

- Для image-вкладень у UI реалізовано lightbox-перегляд із візуальними ефектами:
  - плавне збільшення (zoom-in),
  - fade-in/backdrop,
  - hover-ефект мініатюри,
  - закриття через кнопку `×` і клік по затемненій області.
- Checklist очищено: прибрано застарілі формулювання, залишено лише актуальні status/result та next steps.

## 5) Актуальний план доробок до формального sign-off

1. **P0: Докази виконання** — прогнати `qa-stand-check` і `go-no-go-check` з JSON-артефактами в `docs/artifacts/` на середовищі з повним стеком залежностей.
2. **P1: e2e покриття UX** — search/list/thread, lightbox (включно з ESC), preview, realtime reconnect + пагінаційний summary-блок.
3. **P1: Security evidence** — додати автоматизовані негативні тести для XSS/валідації вкладень.
4. **P2: Demo & handoff** — додати демо-відео і фінальний QA handoff checklist з посиланнями на артефакти.

## 6) Junior+ блок (Queue / Cache / Events / WS)

- **Queue**: ✅ уже реалізовано через RabbitMQ + MassTransit (retry/outbox/idempotency).
- **Events**: ✅ уже реалізовано через event-driven контур (publish/consume подій).
- **WebSocket (WS)**: ✅ already covered через SignalR hub (`/hubs/comments`) для realtime-оновлень.
- **Cache**: ⚠️ частково. У проєкті є локальні кеші на фронтенді (наприклад, preview за `storagePath`), але немає явного distributed cache-рівня (Redis/MemoryCache policy) як окремого архітектурного шару.

### Висновок по Junior+ вимозі

Функціонально 3 із 4 пунктів уже виконані на рівні вище за мінімум. Для повного формального покриття блоку Junior+ варто додати задокументований cache-шар (наприклад, Redis для read-heavy сценаріїв: популярні thread/list запити або anti-spam lookup).
