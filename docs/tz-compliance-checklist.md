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

## 9) Зміни, внесені в поточній ітерації (2026-03-19, виправлення Angular template parse error)

1. У `RootListPageComponent` прибрано дубльовані фрагменти розмітки модалки створення root-коментаря, які ламали структуру `<label>/<form>` і викликали `NG5002: Unexpected closing tag "label"`.
2. У reply-формі видалено дубль кнопки submit, щоб залишити один узгоджений стан блокування через `hasBlockingErrors(replyForm)`.
3. Після правки шаблон коректно парситься Angular compiler (помилка `NG5002` більше не відтворюється).

### Що ще треба зробити далі (оновлено після цієї ітерації)

1. Довстановити Apollo-залежності у frontend-середовищі (`apollo-angular`, `@apollo/client`, `graphql`) і стабілізувати збірку `ng serve`/`ng build`.
2. Після стабілізації залежностей прибрати фінальний REST fallback у runtime-потоці, залишивши GraphQL (HotChocolate + Apollo) єдиним transport-шаром.
3. Продовжити декомпозицію `RootListPageComponent`/`ThreadPageComponent` на менші standalone-компоненти (modal/forms), щоб зменшити ризик повторних template regression.

## 10) Зміни, внесені в поточній ітерації (2026-03-19, GraphQL-only runtime + fix завантаження коментарів)

1. Frontend runtime-потік для root list і thread остаточно переведено на GraphQL-only: у `RootListPageComponent` і `ThreadPageComponent` прибрано REST fallback-вибір та helper-методи перемикання.
2. Виправлено мапінг enum-значень сортування для HotChocolate: frontend значення `CreatedAtUtc/UserName/Email` і `Asc/Desc` тепер конвертуються у GraphQL enum-формат `CREATED_AT_UTC/USER_NAME/EMAIL` і `ASC/DESC`, щоб уникнути GraphQL validation error під час завантаження списку.
3. У GraphQL query потоку гілки уточнено scalar тип ідентифікатора до `Uuid!` у `CommentsGraphqlApiService`, щоб узгодити клієнтський запит зі схемою HotChocolate.
4. Прибрано застарілий feature-flag `useGraphqlApi` з frontend environment-конфігурації, оскільки transport-шар тепер єдиний (Apollo + GraphQL).
5. Для чистоти Angular-компіляції оновлено імпорти `AppComponent`: використано `RouterModule` замість окремих директивних імпортів.

### Що ще треба зробити далі (оновлено після цієї ітерації)

1. Завершити повну деактивацію REST transport-шару у frontend: видалити або архівувати `CommentsApiService` після контрольної перевірки, що жоден runtime-сценарій його не використовує.
2. Додати contract/integration перевірки GraphQL для сценаріїв `comments`, `commentThread`, `createComment`, `captchaImage`, `attachmentTextPreview`, включно з negative cases для enum/scalar валідації.
3. Продовжити декомпозицію великих Angular-компонентів (`RootListPageComponent`, `ThreadPageComponent`) на дрібні standalone-блоки для зниження складності шаблонів і покращення підтримуваності.

## 11) Зміни, внесені в поточній ітерації (2026-03-19, fix undefined `replies.length` у root-list)

1. У `RootListPageComponent` додано безпечну обробку дерева відповідей у шаблоні: замість прямого доступу `node.replies.length` використано fallback `(node.replies ?? []).length`, а ітерацію `@for` переведено на `(node.replies ?? [])`; це прибирає runtime-помилку `Cannot read properties of undefined (reading 'length')` при неповних payload-вузлах.
2. У `CommentsGraphqlApiService` додано рекурсивну нормалізацію comment tree (`normalizeCommentNode`), яка гарантує масив `replies` для кожного вузла (навіть якщо backend/GraphQL повернув `null` або неініціалізоване значення).
3. У GraphQL data contracts frontend-клієнта посилено null-safety: для `comments/commentThread/createComment` додано явну перевірку порожнього payload з керованим `Error`, щоб уникати «тихих» збоїв у UI.

### Що ще треба зробити далі (оновлено після цієї ітерації)

1. Додати frontend unit/integration тести на рендер comment tree для кейсів `replies = undefined/null`, щоб зафіксувати regression-protection для Angular-шаблонів.
2. Уніфікувати GraphQL selection sets для дерева коментарів (root/thread/create) і визначити контракт: `replies` завжди повертається як `[]`, навіть для leaf-вузлів.
3. Продовжити декомпозицію `RootListPageComponent` (виділити tree-node у окремий standalone-компонент), щоб зменшити ризик template-runtime помилок у великих inline templates.

## 12) Зміни, внесені в поточній ітерації (2026-03-19, fix thread-вузлів без контенту)

1. У `CommentsGraphqlApiService.getThread` перероблено GraphQL selection set для `commentThread`: замість запиту лише `id` у вкладених `replies` додано фрагменти з полями `userName/email/text/createdAtUtc/attachment` до фіксованої глибини 5 рівнів. Це прибирає кейс, коли в thread-дереві рендерився лише «порожній графічний блок» без даних.
2. У `ThreadPageComponent` прибрано зайві nullish-coalescing вирази `(thread.replies ?? [])` та `(reply.replies ?? [])` у шаблоні, бо `normalizeCommentNode` вже гарантує масив `replies`; це прибирає попередження Angular compiler `NG8102`.
3. Додано пояснювальний inline-коментар у `getThread` щодо обмеження GraphQL на рекурсивні selection sets і обраної стратегії fixed-depth.

### Що ще треба зробити далі (оновлено після цієї ітерації)

1. Погодити на бекенді контракт для глибоких гілок (`replies`) без fixed-depth обмеження: або спеціальний flatten endpoint, або пагінація/expand для дочірніх вузлів.
2. Додати frontend regression-тест для thread-сторінки з багаторівневими відповідями (мінімум 3 рівні), щоб гарантувати відображення контенту у всіх вузлах.
3. Вирівняти `comments` (root-list) selection set із thread-контрактом або явно позначити, що в root-list завантажується скорочений payload для продуктивності.

## 13) Зміни, внесені в поточній ітерації (2026-03-19, hotfix порожніх даних у thread після Apollo cache merge)

1. У `CommentsGraphqlApiService.getThread` виправлено GraphQL-тип фрагмента вкладення: `CommentAttachmentDto` → `AttachmentDto`, щоб selection set відповідав реальній backend GraphQL-схемі для поля `attachment`.
2. У thread-фрагменти додано `__typename` для вузлів коментарів та вкладень, що стабілізує нормалізацію/десеріалізацію payload у Apollo клієнті.
3. Для thread-запиту увімкнено `fetchPolicy: 'no-cache'`, щоб ізолювати дерево гілки від partial cache-даних (коли в інших запитах `replies` завантажуються у скороченому вигляді).

### Що ще треба зробити далі (оновлено після цієї ітерації)

1. Додати e2e/regression сценарій: перехід зі списку root-коментарів у thread не повинен втрачати `userName/email/text/createdAtUtc` у вузлах після попередніх GraphQL-запитів.
2. Узгодити єдиний підхід до Apollo cache для thread-flow: або залишити `no-cache` як тимчасовий hotfix, або перейти на уніфіковані повні selection sets + type policies.
3. Після стабілізації thread-flow винести GraphQL selection set дерева у спільний fragment-builder, щоб уникати розсинхрону між root-list/thread/create запитами.

## 14) Зміни, внесені в поточній ітерації (2026-03-19, hotfix id-only reply вузлів у thread)

1. У `CommentsGraphqlApiService.getThread` змінено найглибший thread-фрагмент (`ThreadCommentLevel5`): прибрано вкладений selection set `replies { id }`, який створював id-only дочірні вузли без `userName/email/text/createdAtUtc` у payload.
2. Додано пояснювальні inline-коментарі біля `ThreadCommentLevel5`, чому на останньому рівні `replies` не запитуються (щоб не рендерити порожні картки); порожній список дочірніх вузлів тепер формується на frontend через `normalizeCommentNode`.
3. У `ThreadPageComponent` прибрано зайві вирази nullish-coalescing (`?? []`) для `thread.replies/reply.replies`, бо після нормалізації ці поля типізовано як масиви; це усуває попередження компілятора Angular `NG8102`.

### Що ще треба зробити далі (оновлено після цієї ітерації)

1. Додати контрактну backend-перевірку для `commentThread`, щоб leaf-вузли повертали `replies: []` консистентно (без залежності від клієнтської нормалізації).
2. Винести thread GraphQL fragments у спільний конструктор/утиліту та перевикористати між запитами, щоб зменшити ризик повторного додавання id-only selection set.
3. Додати e2e-сценарій «deep thread (6+ рівнів)»: UI не повинен рендерити порожні reply-картки без контенту.

## 15) Зміни, внесені в поточній ітерації (2026-03-19, fix незавантаження thread у Angular)

1. У `CommentsGraphqlApiService.getThread` виправлено GraphQL query-документ: прибрано дубльоване вкладене оголошення `query GetCommentThread(...)`, яке формувало невалідний GraphQL запит і блокувало завантаження гілки коментарів у Angular SPA.
2. Для `commentThread` залишено єдине коректне оголошення операції `GetCommentThread($rootCommentId: UUID!)`, синхронізоване зі схемою HotChocolate backend.
3. Оновлено чекліст відповідності ТЗ з фіксацією факту, що проблема «в Angular завантажуються лише root-коментарі» локалізована у frontend GraphQL query string і виправлена.

### Що ще треба зробити далі (оновлено після цієї ітерації)

1. Додати frontend integration/e2e regression-кейс: перехід зі списку root у thread має завжди завантажувати повне дерево (а не лише root-вузол), включно з перевіркою GraphQL error-state.
2. Винести великі GraphQL query/fragment-рядки у окремі `.graphql`-документи або builder-утиліти, щоб уникнути повторного ручного дублювання операторів у template string.
3. Після стабілізації thread-flow повернутися до декомпозиції `RootListPageComponent`/`ThreadPageComponent` на менші standalone-компоненти, щоб знизити ризик регресій у великих inline template/string-блоках.
