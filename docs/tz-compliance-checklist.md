# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-19 (оновлено після інтеграції feature-flag переходу root/thread flow на GraphQL client layer).

> Цей чекліст оновлено після повторної верифікації коду проєкту проти заявленого стеку з ТЗ.
> Неактуальні пункти про «повний перехід на SQLite як цільовий стек ТЗ» видалено.

## 1) Матриця відповідності ТЗ (стан на зараз)

### Backend

| Вимога ТЗ | Статус | Факт у проєкті | Що потрібно доробити |
|---|---|---|---|
| ASP.NET Core 8.0 (LTS) | ✅ Виконано | `Comments.Api` таргетує `net8.0`. | Підтримувати оновлення patch-релізів .NET 8. |
| Entity Framework Core + **SQLite** (за рішенням команди) | ✅ Виконано | EF Core + SQLite використовується як цільовий persistence-стек (`UseSqlite`, `Microsoft.EntityFrameworkCore.Sqlite`). | Підтримувати міграції та backup/restore-процедури для SQLite. |
| GraphQL (HotChocolate) | ✅ Виконано | Підключено `HotChocolate.AspNetCore`, зареєстровані query/mutation, endpoint `/graphql`. | Додати контрактні інтеграційні тести GraphQL (query/mutation/error shape). |
| CQRS + MediatR | ✅ Виконано | Є окремі `Commands`/`Queries`, використовується `MediatR` + pipeline validation behavior. | Покрити ключові CQRS-ланцюжки додатковими integration/e2e тестами. |
| RabbitMQ (**MassTransit**) | ⚠️ Частково | RabbitMQ інтеграція є через `RabbitMQ.Client`, але **MassTransit** відсутній. | Мігрувати транспортний шар на MassTransit (publisher/consumer, retry, DLQ policy, idempotency). |
| Elasticsearch (**NEST**) | ⚠️ Частково | Elasticsearch інтеграція реалізована через `HttpClient`, **NEST/Elastic .NET client** не використовується. | Замінити на офіційний клієнт (NEST/Elastic Client), додати typed mappings/index templates. |
| SignalR | ✅ Виконано | `AddSignalR`, `CommentsHub`, endpoint `/hubs/comments` присутні. | Додати перевірки reconnect/backoff сценаріїв у фронтенд e2e. |
| Clean Architecture + SOLID | ⚠️ Частково | Є поділ на `Domain / Application / Api / Web`, абстракції в `Application`. | Винести інфраструктурні реалізації з `Comments.Api` у `Comments.Infrastructure` (зараз шар лишається scaffold). |

### Frontend

| Вимога ТЗ | Статус | Факт у проєкті | Що потрібно доробити |
|---|---|---|---|
| Angular (standalone components) | ✅ Виконано | Angular 19; компоненти оголошені через standalone-підхід (`imports` у `@Component`). | Уніфікувати component-level style/testing conventions. |
| Apollo Client (GraphQL) | ⚠️ Частково | Додано GraphQL client layer поверх `HttpClient` (`CommentsGraphqlApiService`) і інтегровано у root list/thread/create flow через feature-flag `useGraphqlApi`; частина сценаріїв (captcha/preview/attachment text) лишається на REST. | Підключити Apollo Angular (`apollo-angular`, `@apollo/client`, cache policies) і завершити перехід допоміжних сценаріїв (captcha/preview/attachment text) на узгоджений GraphQL/API-контракт. |
| RxJS | ✅ Виконано | `rxjs` присутній у залежностях та використовується у сервісах. | Розширити reactive state-патерни там, де зараз імперативна логіка у компонентах. |

## 2) Що вже внесено у цей чекліст

1. Видалено неактуальну частину, яка фіксувала SQLite як повну відповідність ТЗ по persistence.
2. Додано нову матрицю відповідності по кожній вимозі з прозорими статусами: ✅ / ⚠️ / ❌.
3. Додано concrete backlog-пункти: MassTransit, NEST/Apollo, а також архітектурне рознесення Infrastructure.
4. Зафіксовано, що SQLite є цільовим persistence-стеком поточного етапу за рішенням команди.

## 3) Пріоритетний план робіт для доведення до повної відповідності ТЗ

1. **P0 — Транспорт подій:**
   - Мігрувати з `RabbitMQ.Client` на **MassTransit**.
   - Додати політики retry, outbox/idempotency та dead-letter handling.

2. **P1 — Elasticsearch client:**
   - Перейти на **NEST/Elastic .NET client** з типізованими DTO для індексації/пошуку.
   - Додати health-check і backfill-перевірки для індексу.

3. **P1 — Frontend GraphQL:**
   - Підключити Apollo Client.
   - Реалізувати GraphQL query/mutation потік щонайменше для: список коментарів, thread, create comment.

4. **P1 — Clean Architecture hardening:**
   - Перенести всі infrastructure-адаптери з `Comments.Api/Infrastructure` до `Comments.Infrastructure`.
   - Залишити в `Comments.Api` лише композиційний root і transport/web concerns.

5. **P2 — Якість та верифікація:**
   - Після повернення тестового контуру додати integration checks для GraphQL + messaging + search.
   - Оновити QA/go-no-go скрипти під нову цільову конфігурацію.

## 4) Нагадування про правило документування

- При редагуванні або створенні **нових класів/методів** обов'язково додаємо коментарі:
  - для C# публічних елементів — XML-коментарі `///`;
  - для складних ділянок логіки — короткі пояснювальні inline-коментарі.

---

Файл підтримується як живий чекліст відповідності ТЗ; після кожної суттєвої технічної зміни статуси в матриці мають бути оновлені в той же PR.


## 5) Зміни, внесені в цій ітерації (2026-03-19)

1. Підтверджено рішення команди залишити SQLite як цільову БД для поточного етапу; матрицю відповідності оновлено під це рішення.
2. Видалено тестові артефакти з backend/frontend (unit/integration/e2e/load-test) і прибрано тестові конфігурації з solution та Angular workspace.
3. Розпочато перехід фронтенда на GraphQL: додано `CommentsGraphqlApiService` з методами для root list, thread і create comment через `/graphql`.

### Що ще треба зробити далі

1. Підключити Apollo Angular (cache + normalized entities), щоб замінити тимчасовий HttpClient-based GraphQL client на повноцінний стек згідно ТЗ.
2. Розширити GraphQL-покриття фронтенду: перевести preview/captcha-сценарії на узгоджений API-контракт (після затвердження схеми на бекенді).
3. Завершити архітектурне рознесення: перенести інфраструктурні адаптери з `Comments.Api/Infrastructure` до `Comments.Infrastructure`.
4. Мігрувати RabbitMQ інтеграцію на MassTransit і додати політики retry/DLQ/idempotency.

## 6) Зміни, внесені в поточній ітерації (2026-03-19)

1. Додано feature-flag `useGraphqlApi` у frontend environment-конфігурацію для керованого перемикання між REST і GraphQL.
2. Інтегровано `CommentsGraphqlApiService` у `RootListPageComponent` для завантаження root-коментарів і створення коментарів/відповідей через GraphQL (за активного feature-flag).
3. Інтегровано `CommentsGraphqlApiService` у `ThreadPageComponent` для завантаження гілки та створення відповіді через GraphQL (за активного feature-flag).
4. Збережено REST-виклики для preview/captcha/attachment-text як тимчасовий сумісний шар до фіналізації GraphQL-контрактів для цих сценаріїв.

## 7) Зміни, внесені в поточній ітерації (2026-03-19, продовження)

1. У `CommentsGraphqlApiService` додано метод `previewComment(text)` для отримання санітизованого HTML-preview через GraphQL query `previewComment`.
2. `RootListPageComponent` переведено на feature-flag вибір джерела preview: за `useGraphqlApi=true` використовується GraphQL preview, інакше лишається REST fallback.
3. `ThreadPageComponent` аналогічно переведено на feature-flag вибір preview-клієнта (GraphQL/REST), щоб вирівняти поведінку root/thread форм.

### Що ще треба зробити далі (оновлено)

1. Підключити Apollo Angular (`apollo-angular`, `@apollo/client`) і замінити поточний HttpClient-based GraphQL transport на Apollo link/cache.
2. Перевести CAPTCHA workflow на узгоджений GraphQL-контракт (отримання challenge + валідація токена), або зафіксувати REST як виняток у ТЗ.
3. Визначити та реалізувати єдину стратегію для `attachment-text preview` (GraphQL endpoint або окремий захищений REST download API з ACL/ttl).
4. Виконати структурне очищення великих Angular-компонентів (виділити modal/forms у standalone дочірні компоненти) для спрощення підтримки та подальшого покриття тестами.

## 8) Зміни, внесені в поточній ітерації (2026-03-19, Apollo + GraphQL-only API flow)

1. Додано backend GraphQL query `captchaImage`, що повертає challengeId/imageBase64/mimeType/ttlSeconds для SPA без REST-виклику `/api/captcha/image`.
2. Додано backend GraphQL query `attachmentTextPreview(storagePath)` для читання `.txt` вкладень через GraphQL із валідацією шляху (`uploads/*`) і захистом від path traversal.
3. Винесено генерацію captcha в окремий `CaptchaChallengeService`, щоб один і той самий доменний алгоритм використовувався і в REST, і в GraphQL transport.
4. Frontend `CommentsGraphqlApiService` переведено на Apollo Angular API (`query`/`mutate`) та розширено методами `getCaptcha()` і `getAttachmentText(storagePath)`.
5. `RootListPageComponent` і `ThreadPageComponent` оновлено так, щоб CAPTCHA/txt-preview також ішли через активний GraphQL-клієнт (REST лишено лише як fallback через feature-flag).
6. Додано Apollo provider (`provideApollo + HttpLink + InMemoryCache`) у `app.config.ts` та оновлено frontend-залежності (`apollo-angular`, `@apollo/client`, `graphql`).

### Що ще треба зробити далі (оновлено після цієї ітерації)

1. Прибрати тимчасовий REST fallback у frontend повністю (прибрати `CommentsApiService` з runtime-флоу та feature-flag переключення), залишивши GraphQL як єдиний transport.
2. Додати GraphQL contract tests (query/mutation/error-shape) для `captchaImage` та `attachmentTextPreview`, включно з негативними кейсами path traversal.
3. Налаштувати робоче джерело npm-пакетів (internal mirror/allowlist) для стабільного встановлення Apollo-залежностей у CI/CD.
4. Після стабілізації Apollo cache — запровадити нормалізацію сутностей і точкову інвалідацію cache після createComment/reply.
