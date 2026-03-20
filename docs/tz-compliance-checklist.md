# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-20 (аудит відповідності ТЗ + cleanup неактуальних пунктів).

> Цей документ оновлено після ревізії репозиторію, `db-schema.mwb`, наявних PDF-файлів ТЗ у корені та поточних скриптів перевірки.

## 0) Важливі обмеження поточної перевірки

- У середовищі перевірки недоступні `dotnet` і `pdftotext`, тому автоматично прогнати runtime/smoke перевірки або витягнути повний текст із PDF не вдалося.
- Для статусу використано фактичний код репозиторію (backend/frontend/docker/scripts) та видимі артефакти.
- Якщо потрібен формальний sign-off «100% виконано», його треба підтвердити окремим запуском `./scripts/qa-stand-check.sh` і `./scripts/go-no-go-check.sh` у середовищі, де встановлено всі залежності.

## 1) Швидкий висновок по відповідності

- **Архітектура і стек (ASP.NET Core 8, Angular standalone, GraphQL, CQRS/MediatR, RabbitMQ/MassTransit, Elasticsearch, SignalR)** — імплементовано.
- **Ключові UX-функції (nested replies, сортування, пагінація 25 за замовчуванням, preview, quick-tags, lightbox, realtime merge)** — імплементовано.
- **Безпека вводу (валідація, CAPTCHA, санітизація XHTML, обмеження вкладень)** — імплементовано на рівні коду.
- **Критичний розрив по артефактах БД:** `db-schema.mwb` порожній (0 байт) і **не відповідає** фактичній EF-схемі.

## 2) Матриця відповідності вимогам (кодова перевірка)

### Backend

| Вимога | Статус | Доказ у коді | Що ще зробити |
|---|---|---|---|
| ASP.NET Core 8.0 (LTS) | ✅ | Проєкт API працює на .NET 8, програма сконфігурована через `WebApplication` + DI. | Тримати patch-релізи .NET 8 актуальними. |
| EF Core + SQLite | ✅ | Підключено `UseSqlite(...)`, нормалізація шляху БД, автозастосування міграцій при старті. | Додати інтеграційний test на cold-start міграцій. |
| GraphQL (HotChocolate) | ✅ | Зареєстровані query/mutation типи, `ValidationExceptionErrorFilter`, `BusinessRuleExceptionErrorFilter`, endpoint `/graphql`. | Додати snapshot baseline для `errors[0].extensions`. |
| CQRS + MediatR | ✅ | Використано команди/запити та `ValidationBehavior<,>`. | Додати e2e для сценаріїв `createComment/addReply/search`. |
| RabbitMQ (MassTransit) | ✅ | Конфігурація transport, consumers, retry, outbox, idempotency (`ProcessedMessage`). | Додати окремий CI smoke для transport-контуру. |
| Elasticsearch | ✅ | Підключено офіційний `Elastic.Clients.Elasticsearch`, index initializer + backfill + resilient fallback. | Перевірка індексації в CI з піднятим Elasticsearch. |
| SignalR | ✅ | Hub `/hubs/comments`, канал публікації подій нових коментарів. | Додати reconnect/backoff e2e тест. |
| XSS/ін’єкції | 🟡 Частково підтверджено кодом | Є санітизація XHTML + валідатори вводу, але немає повного security test-report у репо. | Додати security regression набори (XSS payloads, persistence fuzzing). |

### Frontend

| Вимога | Статус | Доказ у коді | Що ще зробити |
|---|---|---|---|
| Angular standalone components | ✅ | Компоненти оголошені як `standalone`, SPA-маршрути працюють через root/thread pages. | Додати e2e smoke для всіх ключових маршрутів. |
| Apollo Client + GraphQL | ✅ | Використовується GraphQL API контракт + обробка GraphQL помилок у shared core-сервісах. | Додати e2e UX для `BAD_USER_INPUT`/retry. |
| Пагінація 25 за замовчуванням | ✅ | У query-моделях `PageSize = 25` за замовчуванням (REST/GraphQL шари). | Перевірити UI snapshot для дефолтного `25 / стор.`. |
| Сортування root-коментарів | ✅ | Підтримано сортування за полями та напрямком; дефолт — `CreatedAtUtc Desc` (LIFO). | Додати e2e на всі комбінації sort-field/sort-direction. |
| Каскадні відповіді будь-якої глибини | ✅ (логіка дерева) | Self-reference у БД + рекурсивний merge у UI для replies. | Додати stress e2e на глибокі дерева. |
| Preview без перезавантаження | ✅ | Є окремий preview-flow/state для форми коментаря. | Додати e2e з перевіркою fallback-повідомлень. |
| Quick formatting `[i][strong][code][a]` | ✅ | Виділений `QuickTagsToolbarComponent` із потрібними тегами. | Додати keyboard-accessibility тест-кейси. |
| Lightbox для вкладень | ✅ | У web UI є окремий lightbox-діалог і кнопки перегляду зображень. | Додати e2e перевірку відкриття/закриття lightbox. |
| Realtime оновлення (SignalR) | ✅ | Реалізовано realtime merge для root list + thread. | Додати сценарій втрати з’єднання/повторного підключення. |

### Вкладення та обмеження файлів

| Вимога | Статус | Доказ у коді | Що ще зробити |
|---|---|---|---|
| PNG/JPG/GIF + TXT | ✅ | Допустимі MIME-типи явно перелічені у валідаторі та storage. | Додати API contract test з недопустимим MIME. |
| TXT ≤ 100 KB | ✅ | Для `text/plain` є перевірка `MaxTextSizeBytes`. | Додати boundary-тести 100KB/100KB+1. |
| Image auto-resize до 320×240 | ✅ | `ResizeMode.Max` з `MaxImageWidth/MaxImageHeight` у storage normalization. | Додати інтеграційний test на великий image upload. |

## 3) Перевірка `db-schema.mwb` проти фактичної БД

- Поточний `db-schema.mwb` у корені репозиторію має **розмір 0 байт**.
- Через це файл **не містить схеми** і не може відповідати фактичній БД.
- Джерело істини по схемі зараз — EF Core:
  - `Comments` (self-reference через `ParentId`),
  - `ProcessedMessages` (idempotency журнал).

### Що обов’язково зробити

1. Перегенерувати `db-schema.mwb` із актуальної моделі (або замінити на підтримуваний формат, напр. SQL DDL/діаграма).  
2. Додати в CI перевірку, що артефакт схеми БД не порожній і синхронний з міграціями.  
3. Оновити README-блок про БД (зараз згадка про `.mwb` вводить в оману, поки файл пустий).

## 4) Що видалено як неактуальне в цьому оновленні

- Видалено старі формулювання про «повне 100% виконання» без підтверджувальних run-артефактів.
- Видалено надлишкові пункти попередньої ітерації, що дублювали технічні деталі GraphQL без прив’язки до повної матриці ТЗ.
- Актуалізовано план робіт лише тим, що реально залишилось для закриття ТЗ/приймання.

## 5) Актуальний план доробок до формального sign-off

1. **P0: Схема БД** — відновити/заповнити `db-schema.mwb` та синхронізувати з EF міграціями.
2. **P0: Докази виконання** — прогнати `qa-stand-check` і `go-no-go-check` з JSON-артефактами в `docs/artifacts/`.
3. **P1: e2e покриття UX** — search/list/thread, lightbox, preview, realtime reconnect.
4. **P1: Security evidence** — додати автоматизовані негативні тести для XSS/валідації вкладень.
5. **P2: Demo & handoff** — додати демо-відео і фінальний QA handoff checklist з посиланнями на артефакти.
