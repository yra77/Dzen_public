# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-17 (ітерація 41).

## Підсумок

- **Повністю виконано:** 32 пункти.
- **Частково виконано:** 2 пункти.
- **Не виконано:** 3 пункти.

> Висновок: поточний стан ще не покриває **всі** вимоги ТЗ на 100%. Документаційний контур синхронізовано з README, а незакриті пункти сфокусовано в практичному roadmap (Angular, CQRS, production-hardening RabbitMQ, фінальний прогін Middle+ load-test, demo).

---












## Оновлення ітерації 41

### Внесені зміни в цій ітерації

- ✅ Розширено integration-покриття `src/Comments.Api.Tests/ValidationIntegrationTests.cs` для `comments` (REST + GraphQL) boundary/negative кейсами для `filter`:
  - `GetComments_WithFilterLongerThan200_ReturnsBadRequestValidationProblem`;
  - `GraphQlComments_WithFilterLongerThan200_ReturnsBadUserInputError`.
- ✅ Закрито edge-case комбінації `filter + sort + pagination` на порожній сторінці у REST і GraphQL:
  - `GetComments_WithSortPaginationAndFilter_EmptyPageReturnsNoItems`;
  - `GraphQlComments_WithSortPaginationAndFilter_EmptyPageReturnsNoItems`.
- ✅ Додано XML-коментарі до оновленого тестового класу, методів і допоміжних моделей payload/error, щоб дотримати вимогу коментування класів/методів/моделей.

### Що ще треба зробити у проєкті (актуально після ітерації 41)

1. 🟨 **Angular LTS (довести до production-ready):**
   - додати e2e smoke для ключових user-flow (`root create`, `thread reply`, `preview`, `attachments`, `realtime`);
   - уніфікувати UX-відображення API/GraphQL validation помилок.
2. 🟨 **CQRS + MediatR + FluentValidation (закриття edge-cases):**
   - формалізувати контракт `validationErrors` у GraphQL `extensions` в README/API docs;
   - додати окремий docs-приклад для `Filter` validation-помилки (REST + GraphQL).
3. 🟨 **RabbitMQ production-hardening:**
   - довести delayed retry + DLQ replay tooling;
   - додати метрики consumer-обробки та базові alert-умови.
4. 🔲 **Фінальний Middle+ load-test у цільовому контурі RabbitMQ + Elasticsearch:**
   - виконати прогін `load-test/comments-middle.js`;
   - заповнити `docs/load-test-middle-results.md` фактичними метриками та додати актуальний `docs/artifacts/k6-middle-summary.json`.
5. 👤 **Delivery-артефакт Demo:**
   - пункт делеговано власнику репозиторію (секція `Demo` у `README.md` + посилання на відео) — у цій ітерації не змінювався.

---

## Оновлення ітерації 40

### Внесені зміни в цій ітерації

- ✅ Додано optional `filter` у paged-list контракт `comments` для REST (`GET /api/comments`) і GraphQL (`comments/ commentsPage`), щоб закрити частину mixed `sort/filter` backlog без зміни базового DTO-контракту.
- ✅ Розширено шар репозиторію (`ICommentRepository`, `EfCommentRepository`, `InMemoryCommentRepository`) фільтрацією root-коментарів по `userName/email/text` із збереженням сортування та pagination.
- ✅ Розширено integration-покриття `src/Comments.Api.Tests/ValidationIntegrationTests.cs` двома mixed сценаріями:
  - `GetComments_WithSortPaginationAndFilter_ReturnsFilteredPageSlice` (REST);
  - `GraphQlComments_WithSortPaginationAndFilter_ReturnsFilteredOrderingWithoutErrors` (GraphQL).
- ✅ Додано XML-коментарі в оновлені класи/методи/контракти Application та Api (controller/query handler/service/repository), щоб виконати вимогу про коментарі в коді.

### Що ще треба зробити у проєкті (актуально після ітерації 40)

1. 🟨 **Angular LTS (довести до production-ready):**
   - додати e2e smoke для ключових user-flow (`root create`, `thread reply`, `preview`, `attachments`, `realtime`);
   - уніфікувати UX-відображення API/GraphQL validation помилок.
2. 🟨 **CQRS + MediatR + FluentValidation (закриття edge-cases):**
   - додати boundary/negative кейси для нового `filter` у `comments` (REST + GraphQL), зокрема `filter` length > 200 та комбінації `filter + sort + pagination` на порожній сторінці;
   - формалізувати контракт `validationErrors` у GraphQL `extensions` в README/API docs.
3. 🟨 **RabbitMQ production-hardening:**
   - довести delayed retry + DLQ replay tooling;
   - додати метрики consumer-обробки та базові alert-умови.
4. 🔲 **Фінальний Middle+ load-test у цільовому контурі RabbitMQ + Elasticsearch:**
   - виконати прогін `load-test/comments-middle.js`;
   - заповнити `docs/load-test-middle-results.md` фактичними метриками та додати актуальний `docs/artifacts/k6-middle-summary.json`.
5. 👤 **Delivery-артефакт Demo:**
   - пункт делеговано власнику репозиторію (секція `Demo` у `README.md` + посилання на відео) — у цій ітерації не змінювався.

---

## Оновлення ітерації 39

### Внесені зміни в цій ітерації

- ✅ Розширено integration-покриття `src/Comments.Api.Tests/ValidationIntegrationTests.cs` mixed sort/pagination сценарієм для REST: додано тест `GetComments_WithSortAndPagination_ReturnsExpectedPageSlice`, який перевіряє `page=2&pageSize=2&sortBy=UserName&sortDirection=Asc` і очікуваний порядок елементів на другій сторінці.
- ✅ Додано GraphQL integration-сценарій `GraphQlComments_WithSortAndBoundaryPageSize_ReturnsExpectedOrderingWithoutErrors`, що перевіряє комбінацію `comments(page:1, pageSize:100, sortBy: Email, sortDirection: Desc)` та порядок елементів у `items`.
- ✅ Backlog по CQRS + FluentValidation edge-cases звужено для paged-list контрактів: mixed sort/filter напрямок деталізовано додатковими mixed sort/pagination перевірками у REST і GraphQL.

### Що ще треба зробити у проєкті (актуально після ітерації 39)

1. 🟨 **Angular LTS (довести до production-ready):**
   - додати e2e smoke для ключових user-flow (`root create`, `thread reply`, `preview`, `attachments`, `realtime`);
   - уніфікувати UX-відображення API/GraphQL validation помилок.
2. 🟨 **CQRS + MediatR + FluentValidation (закриття edge-cases):**
   - додати mixed `sort/filter` сценарії для paged list (`comments`) у REST та GraphQL, включно з boundary pagination у комбінації з `sortBy/sortDirection` (частково закрито цією ітерацією; залишаються кейси з одночасним filter-параметром);
   - формалізувати контракт `validationErrors` у GraphQL `extensions` в README/API docs.
3. 🟨 **RabbitMQ production-hardening:**
   - довести delayed retry + DLQ replay tooling;
   - додати метрики consumer-обробки та базові alert-умови.
4. 🔲 **Фінальний Middle+ load-test у цільовому контурі RabbitMQ + Elasticsearch:**
   - виконати прогін `load-test/comments-middle.js`;
   - заповнити `docs/load-test-middle-results.md` фактичними метриками та додати актуальний `docs/artifacts/k6-middle-summary.json`.
5. 👤 **Delivery-артефакт Demo:**
   - пункт делеговано власнику репозиторію (секція `Demo` у `README.md` + посилання на відео) — у цій ітерації не змінювався.

---

## Оновлення ітерації 38

### Внесені зміни в цій ітерації

- ✅ Розширено integration-покриття `src/Comments.Api.Tests/ValidationIntegrationTests.cs` для сценарію сортування дерева у REST: додано тест `GetThread_WithSortByUserNameAsc_ReturnsRepliesSortedAscending`, який перевіряє `sortBy=UserName&sortDirection=Asc` на реальних reply-коментарях.
- ✅ Додано GraphQL integration-сценарій `GraphQlCommentTree_WithSortByEmailDesc_ReturnsRepliesSortedDescending` для перевірки контракту `commentTree(sortBy: Email, sortDirection: Desc)` з очікуваним порядком `replies`.
- ✅ Винесено helper `CreateCommentAsync` у тестовому класі, щоб стандартизувати підготовку тестових даних для mixed sort/filter backlog і зменшити дублювання payload у нових інтеграційних кейсах.

### Що ще треба зробити у проєкті (актуально після ітерації 38)

1. 🟨 **Angular LTS (довести до production-ready):**
   - додати e2e smoke для ключових user-flow (`root create`, `thread reply`, `preview`, `attachments`, `realtime`);
   - уніфікувати UX-відображення API/GraphQL validation помилок.
2. 🟨 **CQRS + MediatR + FluentValidation (закриття edge-cases):**
   - додати mixed `sort/filter` сценарії для paged list (`comments`) у REST та GraphQL, включно з boundary pagination у комбінації з `sortBy/sortDirection`;
   - формалізувати контракт `validationErrors` у GraphQL `extensions` в README/API docs.
3. 🟨 **RabbitMQ production-hardening:**
   - довести delayed retry + DLQ replay tooling;
   - додати метрики consumer-обробки та базові alert-умови.
4. 🔲 **Фінальний Middle+ load-test у цільовому контурі RabbitMQ + Elasticsearch:**
   - виконати прогін `load-test/comments-middle.js`;
   - заповнити `docs/load-test-middle-results.md` фактичними метриками та додати актуальний `docs/artifacts/k6-middle-summary.json`.
5. 👤 **Delivery-артефакт Demo:**
   - пункт делеговано власнику репозиторію (секція `Demo` у `README.md` + посилання на відео) — у цій ітерації не змінювався.

---


## Оновлення ітерації 37

### Внесені зміни в цій ітерації

- ✅ Розширено `src/Comments.Api.Tests/ValidationIntegrationTests.cs` edge-case сценаріями для REST `preview/search`: додано boundary-перевірки (`text` довжиною 5000, `pageSize=100`) і negative-case для `pageSize=101` з очікуванням `400` + `ValidationProblem`.
- ✅ Додано аналогічне edge-case покриття для GraphQL `previewComment/searchComments`: boundary (`text=5000`, `pageSize=100`) та валідаційний negative-path (`pageSize=101`) з перевіркою `BAD_USER_INPUT` і `extensions.validationErrors.PageSize`.
- ✅ Backlog по CQRS + FluentValidation contract coverage звужено: для `preview/search` тепер покрито не тільки happy-path, а й ключові boundary/limit кейси у REST та GraphQL.

### Що ще треба зробити у проєкті (актуально після ітерації 37)

1. 🟨 **Angular LTS (довести до production-ready):**
   - додати e2e smoke для ключових user-flow (`root create`, `thread reply`, `preview`, `attachments`, `realtime`);
   - уніфікувати UX-відображення API/GraphQL validation помилок.
2. 🟨 **CQRS + MediatR + FluentValidation (закриття edge-cases):**
   - додати сценарії для `mixed sort/filter combos` у запитах списку/дерева (`comments page`, `commentTree`) та зафіксувати очікуваний контракт у тестах;
   - формалізувати контракт `validationErrors` у GraphQL `extensions` в README/API docs.
3. 🟨 **RabbitMQ production-hardening:**
   - довести delayed retry + DLQ replay tooling;
   - додати метрики consumer-обробки та базові alert-умови.
4. 🔲 **Фінальний Middle+ load-test у цільовому контурі RabbitMQ + Elasticsearch:**
   - виконати прогін `load-test/comments-middle.js`;
   - заповнити `docs/load-test-middle-results.md` фактичними метриками та додати актуальний `docs/artifacts/k6-middle-summary.json`.
5. 🔲 **Delivery-артефакт Demo:**
   - додати секцію `Demo` у `README.md`;
   - прикріпити посилання на 3–5 хв відео з ключовими сценаріями.

---

## Оновлення ітерації 36

### Внесені зміни в цій ітерації

- ✅ Розширено integration-тести `src/Comments.Api.Tests/ValidationIntegrationTests.cs` новими happy-path сценаріями для REST: `POST /api/comments/preview` (успішний sanitize HTML) та `GET /api/comments/search` (перевірка shape `PagedResult`).
- ✅ Додано GraphQL happy-path покриття для `previewComment` і `searchComments` з перевіркою відсутності `errors`, валідного `data` і коректної paged-структури (`page`, `pageSize`, `totalCount`, `items`).
- ✅ Частково закрито backlog по CQRS + FluentValidation contract coverage: окрім `create/thread`, тепер покрито success-path для `preview/search` у REST та GraphQL.

### Що ще треба зробити у проєкті (актуально після ітерації 36)

1. 🟨 **Angular LTS (довести до production-ready):**
   - додати e2e smoke для ключових user-flow (`root create`, `thread reply`, `preview`, `attachments`, `realtime`);
   - уніфікувати UX-відображення API/GraphQL validation помилок.
2. 🟨 **CQRS + MediatR + FluentValidation (закриття edge-cases):**
   - додати edge-case інтеграційні сценарії для `preview/search` (boundary text, mixed sort/filter combos) у REST та GraphQL;
   - формалізувати контракт `validationErrors` у GraphQL `extensions` в README/API docs.
3. 🟨 **RabbitMQ production-hardening:**
   - довести delayed retry + DLQ replay tooling;
   - додати метрики consumer-обробки та базові alert-умови.
4. 🔲 **Фінальний Middle+ load-test у цільовому контурі RabbitMQ + Elasticsearch:**
   - виконати прогін `load-test/comments-middle.js`;
   - заповнити `docs/load-test-middle-results.md` фактичними метриками та додати актуальний `docs/artifacts/k6-middle-summary.json`.
5. 🔲 **Delivery-артефакт Demo:**
   - додати секцію `Demo` у `README.md`;
   - прикріпити посилання на 3–5 хв відео з ключовими сценаріями.

---

## Оновлення ітерації 35

### Внесені зміни в цій ітерації

- ✅ Розширено integration-тести `src/Comments.Api.Tests/ValidationIntegrationTests.cs` позитивними (happy-path) REST сценаріями: успішне створення коментаря (`POST /api/comments`) та побудова дерева (`GET /api/comments/{rootId}/thread`) після створення reply.
- ✅ Додано GraphQL happy-path сценарій для `addComment`: перевіряється відсутність `errors`, наявність `data.addComment` і коректність ключових полів (`id`, `userName`, `text`).
- ✅ Це додатково закриває edge-case прогалини по пункту CQRS + FluentValidation contract coverage (не лише negative-path, а й success-path для REST/GraphQL).

### Що ще треба зробити у проєкті (актуально після ітерації 35)

1. 🟨 **Angular LTS (довести до production-ready):**
   - додати e2e smoke для ключових user-flow (`root create`, `thread reply`, `preview`, `attachments`, `realtime`);
   - уніфікувати UX-відображення API/GraphQL validation помилок.
2. 🟨 **CQRS + MediatR + FluentValidation (закриття edge-cases):**
   - додати ще integration-сценарії для `preview`/`search` happy-path у GraphQL та REST (з перевіркою shape paged-result);
   - формалізувати контракт `validationErrors` у GraphQL `extensions` в README/API docs.
3. 🟨 **RabbitMQ production-hardening:**
   - довести delayed retry + DLQ replay tooling;
   - додати метрики consumer-обробки та базові alert-умови.
4. 🔲 **Фінальний Middle+ load-test у цільовому контурі RabbitMQ + Elasticsearch:**
   - виконати прогін `load-test/comments-middle.js`;
   - заповнити `docs/load-test-middle-results.md` фактичними метриками та додати актуальний `docs/artifacts/k6-middle-summary.json`.
5. 🔲 **Delivery-артефакт Demo:**
   - додати секцію `Demo` у `README.md`;
   - прикріпити посилання на 3–5 хв відео з ключовими сценаріями.

---

## Оновлення ітерації 34

### Внесені зміни в цій ітерації

- ✅ Розширено integration-покриття `src/Comments.Api.Tests` для GraphQL validation contract: додано перевірки, що `extensions.validationErrors` повертається стабільно для невалідного `searchComments` (`Page`, `PageSize`) та `addComment` із невалідною CAPTCHA (`Request.CaptchaToken`).
- ✅ Додано окремий GraphQL-негативний сценарій для вкладень: `addComment` з недозволеним `attachment.contentType` (`application/pdf`) і перевіркою ключа `Request.Attachment.ContentType` у `extensions.validationErrors`.
- ✅ Це зменшує ризик регресії по пункту ТЗ щодо консистентної валідації REST/GraphQL на рівні CQRS+FluentValidation, але повністю пункт ще не закрито (потрібні додаткові success/edge-case тести).

### Що ще треба зробити у проєкті (актуально після ітерації 34)

1. 🟨 **Angular LTS (довести до production-ready):**
   - додати e2e smoke для ключових user-flow (`root create`, `thread reply`, `preview`, `attachments`, `realtime`);
   - уніфікувати UX-відображення API/GraphQL validation помилок.
2. 🟨 **CQRS + MediatR + FluentValidation (закриття edge-cases):**
   - розширити інтеграційні тести success/negative сценаріїв для REST + GraphQL (включно з thread/create/preview happy-path);
   - формалізувати контракт `validationErrors` у GraphQL `extensions` в README/API docs.
3. 🟨 **RabbitMQ production-hardening:**
   - довести delayed retry + DLQ replay tooling;
   - додати метрики consumer-обробки та базові alert-умови.
4. 🔲 **Фінальний Middle+ load-test у цільовому контурі RabbitMQ + Elasticsearch:**
   - виконати прогін `load-test/comments-middle.js`;
   - заповнити `docs/load-test-middle-results.md` фактичними метриками та додати актуальний `docs/artifacts/k6-middle-summary.json`.
5. 🔲 **Delivery-артефакт Demo:**
   - додати секцію `Demo` у `README.md`;
   - прикріпити посилання на 3–5 хв відео з ключовими сценаріями.

---

## Оновлення ітерації 33

### Внесені зміни в цій ітерації

- ✅ Проведено повторну звірку проєкту з пунктами ТЗ ("ТЗ на розробку SPA-застосунку.pdf") на основі поточного стану коду, README і технічних артефактів у `docs/`.
- ✅ Підтверджено, що **100% відповідності ТЗ поки немає**: зберігається статус **32 виконано / 2 частково / 3 не виконано**.
- ✅ Актуалізовано short-list задач, які треба закрити для повної відповідності ТЗ, без зміни загальної пріоритизації (P0 → P1 → P2).

### Що ще треба зробити у проєкті (актуально після ітерації 33)

1. 🟨 **Angular LTS (довести до production-ready):**
   - додати e2e smoke для ключових user-flow (`root create`, `thread reply`, `preview`, `attachments`, `realtime`);
   - уніфікувати UX-відображення API/GraphQL validation помилок.
2. 🟨 **CQRS + MediatR + FluentValidation (закриття edge-cases):**
   - розширити інтеграційні тести success/negative сценаріїв для REST + GraphQL;
   - зафіксувати стабільний shape `validationErrors` у GraphQL `extensions`.
3. 🟨 **RabbitMQ production-hardening:**
   - довести delayed retry + DLQ replay tooling;
   - додати метрики consumer-обробки та базові alert-умови.
4. 🔲 **Фінальний Middle+ load-test у цільовому контурі RabbitMQ + Elasticsearch:**
   - виконати прогін `load-test/comments-middle.js`;
   - заповнити `docs/load-test-middle-results.md` фактичними метриками та додати актуальний `docs/artifacts/k6-middle-summary.json`.
5. 🔲 **Delivery-артефакт Demo:**
   - додати секцію `Demo` у `README.md`;
   - прикріпити посилання на 3–5 хв відео з ключовими сценаріями.

---

## Оновлення ітерації 32

### Внесені зміни в цій ітерації

- ✅ У `src/Comments.Web` для txt-вкладень додано явний loading-state під час lazy preview: кнопка `Показати txt preview` тепер блокується на час запиту, а в UI показується повідомлення `Завантаження txt preview...` (root-list + thread/replies).
- ✅ Це закриває один із UX-gap пунктів Angular migration із backlog (індикатор завантаження для txt-preview).

### Що ще треба зробити у проєкті (актуально після ітерації 32)

1. 🟨 Завершити **Angular LTS migration** у `src/Comments.Web`: додати e2e smoke для root+thread сценаріїв (create/reply/realtime/attachments), синхронізувати UX-обробку API validation помилок.
2. 🟨 Дозавершити **CQRS + MediatR + FluentValidation**: розширити success-path та edge-case integration покриття (REST + GraphQL), включно з shape `validationErrors` у GraphQL `extensions`.
3. 🟨 Дозавершити **RabbitMQ production-hardening**: delayed retry/DLQ replay tooling, метрики consumer-обробки та алерти.
4. 🟨 Виконати **фінальний Middle+ load-test** у середовищі RabbitMQ+Elasticsearch з оновленням `docs/load-test-middle-results.md` і `docs/artifacts/k6-middle-summary.json`.
5. 🔲 Додати **Demo**-секцію в `README.md` з посиланням на 3–5 хв відео сценаріїв.

---

## Оновлення ітерації 31

### Внесені зміни в цій ітерації

- ✅ У `src/Comments.Web` додано media-preview вкладень у Angular UI для root-list і thread: для `image/*` рендериться inline thumbnail + link на оригінал.
- ✅ Для `text/plain` вкладень реалізовано lazy txt-preview: кнопка завантаження контенту з `storagePath` і відображення в `<pre>` без повного reload сторінки.
- ✅ `CommentsApiService` розширено методом `getAttachmentText(...)`, щоб уніфікувати доступ до статичних вкладень через API base URL.

### Що ще треба зробити у проєкті (актуально після ітерації 31)

1. 🟨 Завершити **Angular LTS migration** у `src/Comments.Web`: додати e2e smoke для root+thread сценаріїв (create/reply/realtime/attachments), синхронізувати UX-обробку API validation помилок, додати індикатор завантаження для txt-preview.
2. 🟨 Дозавершити **CQRS + MediatR + FluentValidation**: розширити success-path та edge-case integration покриття (REST + GraphQL), включно з shape `validationErrors` у GraphQL `extensions`.
3. 🟨 Дозавершити **RabbitMQ production-hardening**: delayed retry/DLQ replay tooling, метрики consumer-обробки та алерти.
4. 🟨 Виконати **фінальний Middle+ load-test** у середовищі RabbitMQ+Elasticsearch з оновленням `docs/load-test-middle-results.md` і `docs/artifacts/k6-middle-summary.json`.
5. 🔲 Додати **Demo**-секцію в `README.md` з посиланням на 3–5 хв відео сценаріїв.

---

## Оновлення ітерації 30

### Внесені зміни в цій ітерації

- ✅ У `src/Comments.Web` на сторінці root-list реалізовано повний root-level create flow: форма створення кореневого коментаря (user/email/homePage/text) з submit у `POST /api/comments`.
- ✅ Для root-level форми додано `preview` через `POST /api/comments/preview`, CAPTCHA-завантаження/оновлення через `GET /api/captcha/image`, а також attachment pre-validation + base64 upload (`png/jpg/gif/txt`, до 1MB).
- ✅ Підключено SignalR live-refresh на root-list (`commentCreated`): список кореневих коментарів автооновлюється після подій із `/hubs/comments` без ручного reload.

### Що ще треба зробити у проєкті (актуально після ітерації 30)

1. 🟨 Завершити **Angular LTS migration** у `src/Comments.Web`: додати media-preview для вкладень (inline image/txt), покрити root+thread сценарії e2e smoke (create/reply/realtime), синхронізувати UX-обробку API validation помилок.
2. 🟨 Дозавершити **CQRS + MediatR + FluentValidation**: розширити success-path та edge-case integration покриття (REST + GraphQL), включно з shape `validationErrors` у GraphQL `extensions`.
3. 🟨 Дозавершити **RabbitMQ production-hardening**: delayed retry/DLQ replay tooling, метрики consumer-обробки та алерти.
4. 🟨 Виконати **фінальний Middle+ load-test** у середовищі RabbitMQ+Elasticsearch з оновленням `docs/load-test-middle-results.md` і `docs/artifacts/k6-middle-summary.json`.
5. 🔲 Додати **Demo**-секцію в `README.md` з посиланням на 3–5 хв відео сценаріїв.

---

## Оновлення ітерації 29

### Внесені зміни в цій ітерації

- ✅ У `src/Comments.Web` додано recursive tree-render для reply у `thread-page` (рендер вкладених гілок без обмеження в 1 рівень).
- ✅ Розширено `thread-page` формою з live preview: Angular викликає `POST /api/comments/preview` під час редагування тексту та показує HTML-preview перед submit.
- ✅ Додано upload вкладень у reply-формі (`png/jpg/gif/txt`, до 1MB): клієнтська pre-validation, конвертація в base64 та передача в `CreateCommentRequest.attachment`.
- ✅ Підключено SignalR у Angular (`@microsoft/signalr`): thread-екран слухає `commentCreated` і автооновлює гілку після подій з `/hubs/comments`.

### Що ще треба зробити у проєкті (актуально після ітерації 29)

1. 🟨 Завершити **Angular LTS migration** у `src/Comments.Web`: додати відображення вкладень як media-preview (image lightbox / txt preview), додати root-level create flow і e2e smoke для create+reply+realtime.
2. 🟨 Дозавершити **CQRS + MediatR + FluentValidation**: розширити success-path та edge-case integration покриття (REST + GraphQL), включно з shape `validationErrors` у GraphQL `extensions`.
3. 🟨 Дозавершити **RabbitMQ production-hardening**: delayed retry/DLQ replay tooling, метрики consumer-обробки та алерти.
4. 🟨 Виконати **фінальний Middle+ load-test** у середовищі RabbitMQ+Elasticsearch з оновленням `docs/load-test-middle-results.md` і `docs/artifacts/k6-middle-summary.json`.
5. 🔲 Додати **Demo**-секцію в `README.md` з посиланням на 3–5 хв відео сценаріїв.

---

## Оновлення ітерації 28

### Внесені зміни в цій ітерації

- ✅ Розширено `CommentsApiService` у `src/Comments.Web`: додано типізовані контракти `CommentNode`/`CommentAttachment`, завантаження thread (`GET /api/comments/{rootId}/thread`), CAPTCHA (`GET /api/captcha/image`) та створення коментаря/reply (`POST /api/comments`).
- ✅ Оновлено сторінку `root-list`: виправлено тип `id` на `string` (GUID-сумісно з backend), додано відображення кількості відповідей і стабілізовано навігацію у `/thread/:id`.
- ✅ Замість scaffold-заглушки реалізовано робочий `thread`-екран: завантаження гілки, рендер root-коментаря + відповідей, форма reply (user/email/text), оновлення CAPTCHA та повторне завантаження thread після успішного submit.

### Що ще треба зробити у проєкті (актуально після ітерації 28)

1. 🟨 Завершити **Angular LTS migration** у `src/Comments.Web`: додати рекурсивний tree-render для вкладених reply, preview перед submit, attachment upload/preview та SignalR live updates + e2e smoke.
2. 🟨 Дозавершити **CQRS + MediatR + FluentValidation**: розширити success-path та edge-case integration покриття (REST + GraphQL), включно з shape `validationErrors` у GraphQL `extensions`.
3. 🟨 Дозавершити **RabbitMQ production-hardening**: delayed retry/DLQ replay tooling, метрики consumer-обробки та алерти.
4. 🟨 Виконати **фінальний Middle+ load-test** у середовищі RabbitMQ+Elasticsearch з оновленням `docs/load-test-middle-results.md` і `docs/artifacts/k6-middle-summary.json`.
5. 🔲 Додати **Demo**-секцію в `README.md` з посиланням на 3–5 хв відео сценаріїв.

---

## Оновлення ітерації 27

### Внесені зміни в цій ітерації

- ✅ У `src/Comments.Web` додано Angular LTS standalone scaffold (конфіг workspace + `main.ts` + `app.config.ts`).
- ✅ Реалізовано базову маршрутизацію Angular: `/` (root-list) та `/thread/:id` (thread page scaffold).
- ✅ Додано первинний `CommentsApiService` для завантаження root-коментарів через `GET /api/comments` і оновлено `src/Comments.Web/README.md` з інструкцією запуску.
- ✅ Синхронізовано статус у кореневому `README.md`: Angular-міграція переведена зі стану "не почато" у "в процесі".

### Що ще треба зробити у проєкті (актуально після ітерації 27)

1. 🟨 Завершити **Angular LTS migration** у `src/Comments.Web`: перенести create/reply/preview, captcha challenge, attachment preview, SignalR live updates і додати e2e smoke.
2. 🟨 Дозавершити **CQRS + MediatR + FluentValidation**: розширити success-path та edge-case integration покриття (REST + GraphQL), включно з shape `validationErrors` у GraphQL `extensions`.
3. 🟨 Дозавершити **RabbitMQ production-hardening**: delayed retry/DLQ replay tooling, метрики consumer-обробки та алерти.
4. 🟨 Виконати **фінальний Middle+ load-test** у середовищі RabbitMQ+Elasticsearch з оновленням `docs/load-test-middle-results.md` і `docs/artifacts/k6-middle-summary.json`.
5. 🔲 Додати **Demo**-секцію в `README.md` з посиланням на 3–5 хв відео сценаріїв.

---


## Оновлення ітерації 26

### Внесені зміни в цій ітерації

- ✅ Посилено валідацію `CreateCommentCommand`: CAPTCHA перевіряється на рівні FluentValidation/MediatR pipeline (замість пізнього падіння в service-layer), тож REST/GraphQL повертають консистентний validation error format.
- ✅ Додано guard-валидацію вкладень у `CreateCommentCommandValidator` (перевірка `fileName`, whitelist `contentType`, валідний `base64Content`) до виклику storage-шару.
- ✅ Розширено інтеграційні API-тести (`Comments.Api.Tests`): додано сценарії для `GET thread`, `POST preview`, `POST create` (captcha/attachment), а також GraphQL mutation `addComment` з невалідною CAPTCHA.

### Що ще треба зробити у проєкті (актуально після ітерації 26)

1. 🔲 Завершити **Angular LTS migration** у `src/Comments.Web` (routes `/`, `/thread/:id`, list/tree, create/reply, preview, captcha, attachments, realtime).
2. 🟨 Дозавершити **CQRS + MediatR + FluentValidation**: додати інтеграційні кейси для success-path та edge-case сценаріїв сортування/пагінації/вкладень у GraphQL та REST, включно з перевіркою shape `validationErrors` у GraphQL `extensions`.
3. 🟨 Дозавершити **RabbitMQ production-hardening**: delayed retry/DLQ replay tooling, метрики consumer-обробки та алерти.
4. 🟨 Виконати **фінальний Middle+ load-test** у середовищі RabbitMQ+Elasticsearch з оновленням `docs/load-test-middle-results.md` і `docs/artifacts/k6-middle-summary.json`.
5. 🔲 Додати **Demo**-секцію в `README.md` з посиланням на 3–5 хв відео сценаріїв.

---

## Оновлення ітерації 25

### Внесені зміни в цій ітерації

- ✅ Додано global middleware `ValidationExceptionHandlingMiddleware`, який перетворює FluentValidation-помилки MediatR pipeline у стандартний HTTP `400 ValidationProblemDetails` для REST endpoint-ів.
- ✅ Додано GraphQL error filter `ValidationExceptionErrorFilter`: валідаційні помилки повертаються як GraphQL `errors` з кодом `BAD_USER_INPUT` і деталями `validationErrors` у extensions.
- ✅ Додано новий інтеграційний test-проєкт `Comments.Api.Tests` з перевірками двох критичних сценаріїв: REST 400 на невалідну пагінацію та GraphQL validation error на невалідний `searchComments` запит.

### Що ще треба зробити у проєкті (актуально після ітерації 25)

1. 🔲 Завершити **Angular LTS migration** у `src/Comments.Web` (routes `/`, `/thread/:id`, list/tree, create/reply, preview, captcha, attachments, realtime).
2. 🟨 Дозавершити **CQRS + MediatR + FluentValidation**: розширити API/integration test-покриття на інші endpoint-и й mutation-и (create/preview/thread), додати edge-case сценарії форматів вкладень і CAPTCHA-guards.
3. 🟨 Дозавершити **RabbitMQ production-hardening**: delayed retry/DLQ replay tooling, метрики consumer-обробки та алерти.
4. 🟨 Виконати **фінальний Middle+ load-test** у середовищі RabbitMQ+Elasticsearch і оновити артефакти в `docs/`.
5. 🔲 Додати **Demo**-секцію у `README.md` з посиланням на 3–5 хвилинне відео.

---


## Оновлення ітерації 24

### Внесені зміни в цій ітерації

- ✅ Додано окремий test-проєкт `Comments.Application.Tests` з unit-тестами для `ValidationBehavior` (happy-path + `ValidationException` сценарій).
- ✅ Посилено перевірку CQRS/FluentValidation: додано автотест, що невалідний `SearchCommentsQuery` (empty query, invalid page/pageSize) блокується pipeline-ом до виконання handler.
- ✅ Із `CommentService.GetPageAsync` прибрано дублювання guard-перевірок `page/pageSize`; тепер валідація централізована на рівні query validator + MediatR pipeline.

### Що ще треба зробити у проєкті (актуально після ітерації 24)

1. 🔲 Завершити **Angular LTS migration** у `src/Comments.Web` (routes `/`, `/thread/:id`, list/tree, create/reply, preview, captcha, attachments, realtime).
2. 🟨 Дозавершити **CQRS + MediatR + FluentValidation**: додати API/integration тести для HTTP/GraphQL-помилок валідації (400/GraphQL errors) і покрити решту edge-case валідацій.
3. 🟨 Дозавершити **RabbitMQ production-hardening**: delayed retry/DLQ replay tooling, метрики consumer-обробки та алерти.
4. 🟨 Виконати **фінальний Middle+ load-test** у середовищі RabbitMQ+Elasticsearch і оновити артефакти в `docs/`.
5. 🔲 Додати **Demo**-секцію у `README.md` з посиланням на 3–5 хвилинне відео.

---


## Оновлення ітерації 23

### Внесені зміни в цій ітерації

- ✅ Додано dedicated CQRS-запит `SearchCommentsQuery` + `SearchCommentsQueryHandler` + `SearchCommentsQueryValidator` для пошуку коментарів через MediatR/FluentValidation pipeline.
- ✅ REST (`GET /api/comments/search`) і GraphQL (`searchComments`) переведено на dispatch пошуку через `IMediator` замість прямого виклику search-сервісу.
- ✅ Контракт `ICommentSearchService` перенесено до `Comments.Application.Abstractions` (ізоляція use-case від API Infrastructure), а в `CommentService` прибрано дублювання більшості валідацій create/preview (залишено CAPTCHA-guard).

### Що ще треба зробити у проєкті (актуально після ітерації 23)

1. 🔲 Завершити **Angular LTS migration** у `src/Comments.Web` (routes `/`, `/thread/:id`, list/tree, create/reply, preview, captcha, attachments, realtime).
2. 🟨 Дозавершити **CQRS + MediatR + FluentValidation**: покрити unit/integration тестами validator/pipeline-сценарії, прибрати залишкове дублювання guard-перевірок у `CommentService` (page/pageSize) на користь query-validators.
3. 🟨 Дозавершити **RabbitMQ production-hardening**: delayed retry/DLQ replay tooling, метрики consumer-обробки та алерти.
4. 🟨 Виконати **фінальний Middle+ load-test** у середовищі RabbitMQ+Elasticsearch і оновити артефакти в `docs/`.
5. 🔲 Додати **Demo**-секцію у `README.md` з посиланням на 3–5 хвилинне відео.

---

## Оновлення ітерації 22

### Внесені зміни в цій ітерації

- ✅ Розпочато практичну декомпозицію backend use-cases у CQRS-стиль через MediatR: додано команди/запити `CreateComment`, `GetCommentsPage`, `GetCommentThread`, `PreviewComment` з окремими handler-ами.
- ✅ Додано FluentValidation + MediatR pipeline behavior (`ValidationBehavior`) для валідації команд/запитів до виконання бізнес-логіки.
- ✅ Оновлено REST/GraphQL інтеграцію на dispatch через `IMediator` без змін зовнішніх контрактів; додано REST endpoint гілки `GET /api/comments/{rootCommentId}/thread`.

### Що ще треба зробити у проєкті (актуально після ітерації 22)

1. 🔲 Завершити **Angular LTS migration** у `src/Comments.Web` (routes `/`, `/thread/:id`, list/tree, create/reply, preview, captcha, attachments, realtime).
2. 🟨 Дозавершити **CQRS + MediatR + FluentValidation**: винести пошук у dedicated query/handler, прибрати дублювання валідації з `CommentService`, додати інтеграційні тести пайплайну валідації.
3. 🟨 Дозавершити **RabbitMQ production-hardening**: delayed retry/DLQ replay tooling, метрики consumer-обробки та алерти.
4. 🟨 Виконати **фінальний Middle+ load-test** у середовищі RabbitMQ+Elasticsearch і оновити артефакти в `docs/`.
5. 🔲 Додати **Demo**-секцію у `README.md` з посиланням на 3–5 хвилинне відео.

---

## Оновлення ітерації 21

### Внесені зміни в цій ітерації

- ✅ Реалізовано персистентну ідемпотентність для RabbitMQ consumer через нову сутність `ProcessedMessage` та таблицю `ProcessedMessages` у `CommentsDbContext`.
- ✅ Додано `IProcessedMessageRepository` + `EfProcessedMessageRepository` для атомарного маркування оброблених `messageId` та пропуску дублікатів після рестартів сервісу.
- ✅ Оновлено `RabbitMqTaskQueuesConsumerHostedService`: замість in-memory `ConcurrentDictionary` використовується БД-захист від повторної обробки повідомлень.

### Що ще треба зробити у проєкті (актуально після ітерації 21)

1. 🔲 Завершити **Angular LTS migration** у `src/Comments.Web` (routes `/`, `/thread/:id`, list/tree, create/reply, preview, captcha, attachments, realtime).
2. 🔲 Завершити **CQRS + MediatR + FluentValidation** у backend use-cases без змін зовнішніх REST/GraphQL контрактів.
3. 🟨 Дозавершити **RabbitMQ production-hardening**: delayed retry/DLQ replay tooling, метрики consumer-обробки та алерти.
4. 🟨 Виконати **фінальний Middle+ load-test** у середовищі RabbitMQ+Elasticsearch і оновити артефакти в `docs/`.
5. 🔲 Додати **Demo**-секцію у `README.md` з посиланням на 3–5 хвилинне відео.

---

## Оновлення ітерації 20

### Внесені зміни в цій ітерації

- ✅ Додано `docs/iteration-20-tz-audit.md` як окремий короткий аудит відповідності ТЗ та continuation-backlog.
- ✅ Підтверджено поточний статус: **32 виконано / 2 частково / 3 не виконано**; 100% відповідності ТЗ ще немає.
- ✅ Синхронізовано README і checklist щодо прямої відповіді на питання «чи дотримуємося всіх пунктів ТЗ» (наразі — ні, є відкриті P0/P1/P2 пункти).

### Що ще треба зробити у проєкті (актуально після ітерації 20)

1. 🔲 Завершити **Angular LTS migration** у `src/Comments.Web` (routes `/`, `/thread/:id`, list/tree, create/reply, preview, captcha, attachments, realtime).
2. 🔲 Завершити **CQRS + MediatR + FluentValidation** у backend use-cases без змін зовнішніх REST/GraphQL контрактів.
3. 🟨 Закрити **RabbitMQ production-hardening**: персистентна ідемпотентність, delayed retry/DLQ/replay, метрики consumer-обробки.
4. 🟨 Виконати **фінальний Middle+ load-test** у середовищі RabbitMQ+Elasticsearch і оновити артефакти в `docs/`.
5. 🔲 Додати **Demo**-секцію у `README.md` з посиланням на 3–5 хвилинне відео.

---



> Примітка: застарілі операційні плани ітерацій 17–19 прибрано з `docs/` як дублікати; їхній зміст зведено в ітерацію 20 та цей чекліст.

## Оновлення ітерації 16

### Внесені зміни в цій ітерації

- ✅ Оновлено документаційний контур: `README.md` синхронізовано з поточним етапом (**ітерація 16**) і відкритими блокерами до 100% відповідності ТЗ.
- ✅ У чеклісті зафіксовано актуальний фокус продовження без повторного повного аудиту: Angular LTS + CQRS/MediatR/FluentValidation як два P0-блокери.
- ✅ Для P1/P2 уточнено практичний backlog: що саме доробити в RabbitMQ hardening, Middle+ load-test та delivery-частині (demo-відео).

### Що ще треба зробити у проєкті (актуально після ітерації 16)

#### P0 — must-have для закриття ТЗ
1. 🔲 **Angular SPA (LTS) у `src/Comments.Web`**
   - Підняти Angular shell + маршрути `/` (таблиця root) і `/thread/:id` (гілка).
   - Перенести функціонал з поточного `wwwroot`: create/reply, preview, captcha image challenge, attachments preview, SignalR live updates.
   - Артефакти приймання: e2e smoke (create + reply + realtime) + оновлений README (розділ запуску фронтенду).
2. 🔲 **CQRS + MediatR + FluentValidation**
   - Винести use-cases у handlers (`AddComment`, `AddReply`, `GetCommentsPage`, `GetCommentTree`, `PreviewComment`).
   - Додати validators + pipeline behaviors (validation/logging/telemetry).
   - Артефакти приймання: unit-тести handlers/validators, без зміни зовнішніх REST/GraphQL контрактів.

#### P1 — production readiness
3. 🟨 **RabbitMQ hardening**
   - ✅ Наявний runbook `docs/rabbitmq-consumer-runbook.md`.
   - 🔲 Перенести ідемпотентність з in-memory у персистентне сховище (SQL/Redis).
   - 🔲 Додати метрики consumer-обробки (success/fail/retry + latency) і базові алерти.
   - 🔲 Додати інтеграційний сценарій перевірки ланцюга retry → DLQ.
4. 🟨 **Middle+ load-test (фіналізація)**
   - Виконати `load-test/comments-middle.js` у середовищі з RabbitMQ + Elasticsearch.
   - Зафіксувати результати в `docs/load-test-middle-results.md`.
   - Додати/оновити артефакт `docs/artifacts/k6-middle-summary.json` і посилання в README.

#### P2 — поставка
5. 🔲 **Demo у README**
   - Додати секцію `Demo` з посиланням на 3–5 хвилинне відео ключових сценаріїв.

---

## Оновлення ітерації 15

- ✅ Додано `docs/rabbitmq-consumer-runbook.md` з операційною інструкцією по consumer-ланцюгу (`indexing` / `file-processing`), DLQ та retry-діагностиці.
- ✅ Синхронізовано `README.md` та checklist: roadmap переведено на **ітерацію 15** з фокусом на відкриті P0/P1/P2 блоки.
- ✅ Уточнено практичний next-step backlog у форматі «що робити наступними комітами» без повторного аудиту всього ТЗ.

### Що ще треба зробити у проєкті (актуально після ітерації 15)

#### P0 — must-have для закриття ТЗ
1. 🔲 **Angular SPA (LTS) у `src/Comments.Web`**
   - Підняти Angular shell + маршрути `/` (таблиця root) і `/thread/:id` (гілка).
   - Перенести функціонал з поточного `wwwroot`: create/reply, preview, captcha image challenge, attachments preview, SignalR live updates.
   - Артефакти приймання: e2e smoke (create + reply + realtime) + оновлений README (розділ запуску фронтенду).
2. 🔲 **CQRS + MediatR + FluentValidation**
   - Винести use-cases у handlers (`AddComment`, `AddReply`, `GetCommentsPage`, `GetCommentTree`, `PreviewComment`).
   - Додати validators + pipeline behaviors (validation/logging/telemetry).
   - Артефакти приймання: unit-тести handlers/validators, без зміни зовнішніх REST/GraphQL контрактів.

#### P1 — production readiness
3. 🟨 **RabbitMQ hardening**
   - ✅ Додано runbook `docs/rabbitmq-consumer-runbook.md` (конфіг, запуск, перевірка черг/DLQ, базовий troubleshooting).
   - 🔲 Перенести ідемпотентність з in-memory у персистентне сховище (SQL/Redis).
   - 🔲 Додати/завести лічильники success/fail/retry + latency метрики для consumer-обробки.
   - 🔲 Додати інтеграційний тестовий сценарій для consumer chain (retry → DLQ).
4. 🟨 **Middle+ load-test (фіналізація)**
   - Реально виконати `load-test/comments-middle.js` у середовищі з RabbitMQ + Elasticsearch.
   - Заповнити `docs/load-test-middle-results.md` і додати артефакт `docs/artifacts/k6-middle-summary.json`.
   - Синхронізувати README посиланням на конкретний згенерований summary-файл.

#### P2 — поставка
5. 🔲 **Demo у README**
   - Додати `Demo`-секцію з посиланням на 3–5 хв відео основних сценаріїв (create/reply, search/sort/page, attachment preview, realtime).

---

## Оновлення ітерації 14

- ✅ Підтверджено та зафіксовано єдиний статус між `README.md` і checklist: незакриті блоки залишаються ті самі (**Angular LTS frontend**, **CQRS/MediatR/FluentValidation**, **production-hardening RabbitMQ**, **фіналізація Middle+ load-test**, **demo**).
- ✅ Додано практичний формат продовження робіт «що робити наступним комітом», щоб можна було рухатись без повторного перечитування всього ТЗ.
- ✅ Уточнено очікувані артефакти приймання для кожного відкритого блоку (код + документ/звіт).

### Що ще треба зробити у проєкті (актуально після ітерації 14)

#### P0 — must-have для закриття ТЗ
1. 🔲 **Angular SPA (LTS) у `src/Comments.Web`**
   - Підняти Angular shell + маршрути `/` (таблиця root) і `/thread/:id` (гілка).
   - Перенести функціонал з поточного `wwwroot`: create/reply, preview, captcha image challenge, attachments preview, SignalR live updates.
   - Артефакти приймання: e2e smoke (create + reply + realtime) + оновлений README (розділ запуску фронтенду).
2. 🔲 **CQRS + MediatR + FluentValidation**
   - Винести use-cases у handlers (`AddComment`, `AddReply`, `GetCommentsPage`, `GetCommentTree`, `PreviewComment`).
   - Додати validators + pipeline behaviors (validation/logging/telemetry).
   - Артефакти приймання: unit-тести handlers/validators, без зміни зовнішніх REST/GraphQL контрактів.

#### P1 — production readiness
3. 🔲 **RabbitMQ hardening**
   - Перенести ідемпотентність з in-memory у персистентне сховище (SQL/Redis).
   - Додати retry/backoff policy, DLQ-спостережуваність, лічильники success/fail/retry + latency метрики.
   - Артефакти приймання: runbook у `docs/` + інтеграційний тестовий сценарій для consumer chain.
4. 🟨 **Middle+ load-test (фіналізація)**
   - Реально виконати `load-test/comments-middle.js` у середовищі з RabbitMQ + Elasticsearch.
   - Заповнити `docs/load-test-middle-results.md` і додати артефакт `docs/artifacts/k6-middle-summary.json`.
   - Синхронізувати README посиланням на конкретний згенерований summary-файл.

#### P2 — поставка
5. 🔲 **Demo у README**
   - Додати `Demo`-секцію з посиланням на 3–5 хв відео основних сценаріїв (create/reply, search/sort/page, attachment preview, realtime).

---

## Оновлення ітерації 13

- ✅ Оновлено статусний меседж у checklist: зафіксовано, що головні незакриті блоки — **Angular LTS frontend**, **CQRS/MediatR/FluentValidation**, **production-hardening RabbitMQ**.
- ✅ Синхронізовано формулювання «що зроблено / що лишилось» з `README.md`, щоб уникнути розбіжностей між двома джерелами правди.
- ✅ Додано чіткий список **наступних робіт у проєкті** з пріоритетами `P0/P1/P2` для продовження без повторного аудиту.

### Що ще треба зробити у проєкті (актуально після ітерації 13)

#### P0 — критично для відповідності ТЗ
1. 🔲 **Angular SPA (LTS) у `src/Comments.Web`**
   - Реалізувати список/таблицю root-коментарів, nested thread view, create/reply форми.
   - Перенести preview, captcha image challenge, attachments preview, SignalR live-updates.
   - Оновити README інструкціями запуску Angular-клієнта + додати e2e smoke сценарій.
2. 🔲 **CQRS + MediatR + FluentValidation**
   - Розкласти поточний `CommentService` на handlers (`AddComment`, `AddReply`, `GetCommentsPage`, `GetCommentTree`, `PreviewComment`).
   - Підключити pipeline behaviors (валідація, логування, telemetry hooks).
   - Додати unit-тести для handlers/validators.

#### P1 — стабільність та експлуатаційна готовність
3. 🔲 **Production-hardening RabbitMQ**
   - Перевести ідемпотентність з in-memory у персистентне сховище (БД або Redis).
   - Додати retry/backoff + DLQ, метрики success/fail/retry/latency.
   - Підготувати docs-runbook у `docs/` і базові інтеграційні тести consumer-ланцюга.
4. 🟨 **Фіналізація Middle+ load-test**
   - Запустити `load-test/comments-middle.js` у середовищі з увімкненими RabbitMQ + Elasticsearch.
   - Зберегти `docs/artifacts/k6-middle-summary.json`.
   - Заповнити `docs/load-test-middle-results.md` реальними p95/p99/error-rate і додати посилання в README.

#### P2 — завершення поставки
5. 🔲 **Demo-блок у README**
   - Записати 3–5 хв демо ключових сценаріїв.
   - Додати секцію `Demo` з посиланням на відео.

---

## Оновлення ітерації 12

- ✅ Синхронізовано формулювання статусу між `README.md` і checklist: зафіксовано, що головний відкритий фронтовий блок — **міграція з vanilla JS на Angular LTS** в `src/Comments.Web`.
- ✅ Уточнено backlog до рівня практичних кроків із вимірюваними артефактами приймання (Definition of Done) для кожного незакритого пункту.
- ✅ Додано окремий короткий **execution-план** (що саме робити далі в репозиторії по кроках), щоб наступну ітерацію можна було виконати без додаткового аудиту.

### Що ще треба зробити у проєкті (практичний план)

#### Крок 1 (P0): Angular SPA (LTS)
1. Створити застосунок у `src/Comments.Web` (Angular 18/19 LTS) з маршрутизацією:
   - `/` — таблиця root-коментарів + пагінація + сортування;
   - `/thread/:id` — завантаження дерева через `commentTree`.
2. Перенести з поточного SPA-функціоналу:
   - create/reply форми, preview, captcha image challenge, attachments preview;
   - SignalR subscribe на `commentCreated` з оновленням списку без reload.
3. Закрити DoD:
   - e2e smoke (мін. сценарій create + reply + realtime);
   - оновлений розділ запуску в `README.md`.

#### Крок 2 (P0): CQRS + MediatR + FluentValidation
1. Розділити `CommentService` на use-case handlers:
   - Commands: `AddComment`, `AddReply`;
   - Queries: `GetCommentsPage`, `GetCommentTree`, `PreviewComment`.
2. Додати валідатори FluentValidation для запитів.
3. Підключити pipeline-behaviors (валідація + логування + telemetry hooks).
4. Закрити DoD:
   - unit-тести validators + handlers;
   - відсутність регресій API-контрактів REST/GraphQL.

#### Крок 3 (P1): Production-hardening RabbitMQ
1. Ідемпотентність обробки подій перенести з in-memory у персистентне сховище (БД/Redis).
2. Retry/backoff політика:
   - delayed retry;
   - окрема DLQ для фатальних помилок.
3. Додати метрики:
   - success/fail/retry counters;
   - latency histogram по consumer handlers.
4. Закрити DoD:
   - інтеграційні тести consumer-ланцюга;
   - технічна нотатка в `docs/` з operational runbook.

#### Крок 4 (P1): Фіналізувати Middle+ load-test
1. Прогнати `load-test/comments-middle.js` проти середовища з увімкненими RabbitMQ + Elasticsearch.
2. Зберегти `docs/artifacts/k6-middle-summary.json`.
3. Заповнити `docs/load-test-middle-results.md` фактичними p95/p99/error-rate.
4. Додати в README посилання на конкретний артефакт прогона.

#### Крок 5 (P2): Demo
1. Записати 3–5 хв відео основних сценаріїв (create/reply, сортування/пагінація, вкладення, realtime).
2. Додати секцію `Demo` у README з посиланням.

## 1) Форма додавання коментаря

| Вимога ТЗ | Статус | Примітка |
|---|---|---|
| `UserName` обов'язковий, тільки латиниця + цифри | ✅ | Перевірка regex `^[a-zA-Z0-9]+$`. |
| `Email` обов'язковий і валідний | ✅ | Валідація `MailAddress.TryCreate`. |
| `HomePage` необов'язковий, валідний URL | ✅ | Перевірка абсолютного `http/https` URL. |
| CAPTCHA обов'язкова перевірка | ✅ | Є `BasicCaptchaValidator` + `RecaptchaCaptchaValidator`. |
| CAPTCHA як зображення + кеш/сесія 5 хв | ✅ | Є endpoint `GET /api/captcha/image`, challenge-кеш у `IMemoryCache`, TTL = 5 хв. |
| Текст із whitelist HTML-тегів (`a`, `code`, `i`, `strong`) | ✅ | Додано строгий whitelist тегів, інші теги блокуються помилкою. |
| Перевірка валідного XHTML (закриття тегів) | ✅ | Додано XML/XHTML-парсинг через `XDocument.Parse`; невалідна розмітка відхиляється. |
| Валідація і на клієнті, і на сервері | ✅ | Серверна валідація доповнена клієнтським UX-паритетом у SPA: preview і submit відображають структуровані помилки sanitizer/XHTML (`tag not allowed`, невалідний XHTML, некоректні атрибути/`href`). |

## 2) Файли/вкладення

| Вимога ТЗ | Статус | Примітка |
|---|---|---|
| Дозволені типи: JPG/GIF/PNG/TXT | ✅ | MIME-обмеження на API і SPA. |
| TXT до 100KB | ✅ | Серверна межа `Attachments:MaxTextSizeBytes=102400` + клієнтська перевірка у SPA. |
| Зображення до 320x240, інакше пропорційний resize | ✅ | Серверний auto-resize у `LocalAttachmentStorage` (`ResizeMode.Max`, 320x240). |
| Прев'ю вкладень до відправки | ✅ | Є прев'ю image і txt в UI. |
| Візуальні ефекти перегляду (Lightbox-подібно) | ✅ | Додано modal/lightbox на базі `<dialog>` для image-вкладень із відкриттям по кліку. |

## 3) Головна сторінка (SPA)

| Вимога ТЗ | Статус | Примітка |
|---|---|---|
| SPA без перезавантаження | ✅ | Fetch/AJAX-робота у `app.js`. |
| Каскадні (nested) відповіді довільної глибини | ✅ | Серверний ліміт `MaxThreadDepth=10` прибрано; для GraphQL у SPA додано поетапне довантаження гілок через `commentTree`, що знімає обмеження фіксованого selection depth. |
| Кореневі коментарі таблицею із сортуванням | ✅ | Додано табличний рендер root-коментарів (`<table>`), сортування працює через існуючі контроли. |
| Сортування за UserName/Email/Date ASC/DESC | ✅ | Підтримується REST і GraphQL. |
| Пагінація по 25 за замовчуванням | ✅ | `pageSize=25` за замовчуванням. |
| Дефолтне сортування LIFO (CreatedAt DESC) | ✅ | Виконується у сервісі та GraphQL defaults. |
| Кнопки швидких тегів `[i] [strong] [code] [a]` | ✅ | Додано toolbar у формі, вставка тегів у textarea. |
| Preview повідомлення без перезавантаження | ✅ | Live preview через серверний preview API (REST/GraphQL), без reload. |

## 4) API / інтеграції

| Вимога ТЗ | Статус | Примітка |
|---|---|---|
| REST API create/list | ✅ | Реалізовано. |
| GraphQL як основний API | 🟨 | GraphQL є, але REST також first-class; у UI перемикач режимів. |
| GraphQL операції `commentsPage`, `commentTree`, `addComment`, `addReply`, `previewComment` | ✅ | Додано окремі GraphQL операції `commentsPage`, `commentTree`, `addComment`, `addReply`, `previewComment` (збережено зворотну сумісність через `comments`/`createComment`). |
| RabbitMQ подія `comment.created` | ✅ | Реалізовано опційно через конфіг. |
| Черги `indexing` і `file-processing` | ✅ | Додано декларацію 2 черг у RabbitMQ, bind до `comments.events` та публікацію окремих routing key (`comment.created.indexing`, `comment.created.file-processing`). |
| Elasticsearch індексація/пошук | ✅ | Індексування при створенні + пошук + backfill. |
| SignalR real-time події нових коментарів | ✅ | Hub `/hubs/comments`, подія `commentCreated`. |

## 5) Архітектура / стек / поставка

| Вимога ТЗ | Статус | Примітка |
|---|---|---|
| ASP.NET Core 8/9 | ✅ | Проєкт на .NET 8. |
| MSSQL + EF Core | ✅ | Є SqlServer конфіг + EF репозиторій. |
| Clean Architecture / SOLID / OOP | 🟨 | Шари відокремлені, але CQRS+MediatR не впроваджено повністю. |
| CQRS + MediatR + FluentValidation | ❌ | MediatR/FluentValidation пакети та pipeline-и відсутні. |
| Angular SPA (LTS) | ❌ | Angular-клієнт не створений, лише vanilla JS SPA. |
| Docker Compose (app, db, rabbitmq, elasticsearch) | ✅ | Наявний `docker-compose.yml`. |
| README + схема БД | ✅ | README і `db-schema.mwb` присутні. |
| Відео-демо | ❌ | У репозиторії не знайдено. |

## 6) Навантажувальне тестування

| Вимога ТЗ | Статус | Примітка |
|---|---|---|
| Наявність сценарію load test (k6/JMeter) | ✅ | Є `load-test/comments-smoke.js` (smoke). |
| Цільовий сценарій масштабу Middle+ (100k users / 1M messages / 24h) | ❌ | Поточний smoke-сценарій значно менший (5 VU, 15s). |

## Першочергові кроки до 100% відповідності

### Внесено в цій ітерації

- ✅ Перероблено рендер головного списку: кореневі коментарі тепер відображаються таблицею (`<table>`) з колонками `UserName/Email/HomePage/Date/Text/Actions`.
- ✅ Для кожного root-коментаря додано окремий row із nested-thread (відповіді довільної структури без штучного ліміту глибини на сервері).
- ✅ Оновлено стилі SPA для табличного layout (`comments-table`, responsive wrapper, допоміжні стани для порожніх replies).
- ✅ Додано Lightbox/modal для image-вкладень у SPA (через `<dialog>`): відкриття з картки коментаря, закриття кнопкою та кліком по backdrop.
- ✅ Санітизація `Text`: замінено повний HTML-encode на whitelist-підхід тільки для тегів `a`, `code`, `i`, `strong`.
- ✅ XHTML-валидація: додано strict parsing (через `XDocument`) і відхилення невалідної/незакритої розмітки.
- ✅ Безпека атрибутів: для `<a>` дозволено тільки `href`, причому лише абсолютні `http/https` URL; для інших тегів атрибути заборонені.

- ✅ Додано клієнтський UX-паритет валідації `Text`: у SPA показуються структуровані помилки sanitizer/XHTML під textarea як для live preview, так і для submit (валідація тегів/атрибутів/`href`/закриття тегів).

- ✅ Прибрано серверне обмеження глибини гілки коментарів (`MaxThreadDepth=10`) у `CommentService`; тепер створення reply не блокується фіксованим лімітом рівнів.
- ✅ Підвищено глибину вибірки nested-відповідей у GraphQL SPA-клієнті (`MAX_GRAPHQL_THREAD_DEPTH`) з 10 до 25 для кращого покриття глибоких дерев у режимі GraphQL.

- ✅ Додано поетапну стратегію для GraphQL nested-дерева в SPA: кнопка «Довантажити гілку» викликає `commentTree(rootCommentId, ...)` і замінює вибраний вузол у локальному дереві без повного перезавантаження сторінки.
- ✅ Оптимізовано UI-дії collapse/expand: перемальовування виконується з локального стану `currentItems` без повторного мережевого запиту.

### Що ще треба зробити

1. Реалізувати **Angular SPA** (заміна/доповнення vanilla JS).
2. Перейти на **MediatR + FluentValidation** у Application-шарі.
3. Додати production-hardening для RabbitMQ (персистентне сховище ідемпотентності, delayed retry/backoff, окремі retry-черги, алерти/метрики).
4. Розширити load-test до вимог Middle+ і зафіксувати метрики.
5. Додати відео-демо у README.


## Останні внесені зміни

- ✅ Додано сервісний метод `GetThreadAsync(...)` для отримання дерева конкретної гілки коментарів за `rootCommentId`.
- ✅ У GraphQL додано окремі операції:
  - query `commentsPage` (окремо від legacy `comments`),
  - query `commentTree(rootCommentId, ...)`,
  - mutation `addComment`,
  - mutation `addReply`,
  - mutation `createComment` залишена як alias для сумісності.
- ✅ Оновлено статус відповідності ТЗ для блоку GraphQL-операцій.

- ✅ RabbitMQ-публікацію розширено для задачних черг: додано `indexing` і `file-processing` (declare/bind/publish) з окремими routing keys; `file-processing` подія відправляється лише коли коментар має вкладення.

- ✅ Додано базовий hosted worker `RabbitMqTaskQueuesConsumerHostedService` для черг `indexing` і `file-processing` (підписка, ack/nack, логування обробки повідомлень).
- ✅ Додано конфіг `RabbitMq:ConsumerEnabled` для керування запуском consumer-воркерів.

- ✅ Для RabbitMQ worker-ів додано надійність обробки: автоматичні повторні спроби з лічильником `x-retry-count`, обмеження `MaxRetryCount`, DLX/DLQ маршрутизація після вичерпання retry.
- ✅ Додано базову ідемпотентність у consumer-ах: дублікати повідомлень з однаковим `MessageId` пропускаються з `ack`.
- ✅ Publisher тепер заповнює `MessageId`, `ContentType` і службові headers для retry-пайплайну.

## Що ще треба зробити у проєкті

1. 🔲 **Angular SPA (LTS) замість vanilla JS** — критичний невиконаний пункт ТЗ.
2. 🔲 **CQRS + MediatR + FluentValidation** — впровадити command/query pipeline та валідатори.
3. ✅ **Надійність RabbitMQ workers (`indexing`/`file-processing`)** — додано retry policy через `x-retry-count`, DLX/DLQ для задачних черг та базову ідемпотентність по `MessageId` у consumer-воркері.
4. ✅ **GraphQL nested-вибірка у SPA для дуже глибоких дерев** — додано кероване довантаження окремих гілок (`commentTree`) у UI-кнопці «Довантажити гілку», що прибирає залежність від одного фіксованого selection set.


## Оновлення ітерації 9

- ✅ Додано розширений сценарій навантажувального тестування `load-test/comments-middle.js` (мікс REST/GraphQL, create/list/search, кілька сценаріїв k6, SLA-thresholds p95/p99, окремі метрики `create/list/search/graphql`).
- ✅ README доповнено інструкцією запуску smoke та Middle+-сценарію (`k6 run ...`, `API_MODE`, `CAPTCHA_TOKEN`).
- 🟨 Пункт ТЗ «розширити load-test до Middle+ і зафіксувати метрики» переведено в **частково виконано**: сценарій та пороги вже є в репозиторії, але ще треба виконати прогін у цільовому середовищі й додати зафіксований звіт/артефакти метрик.

### Що ще треба зробити після ітерації 9

1. 🔲 **Angular SPA (LTS) замість vanilla JS** — виконати міграцію UI з перенесенням поточної функціональності (nested tree, preview, SignalR, lightbox).
2. 🔲 **CQRS + MediatR + FluentValidation** — виділити command/query handlers, валідатори та pipeline behavior.
3. 🔲 **Production-hardening RabbitMQ** — винести ідемпотентність у персистентне сховище, додати delayed retry/backoff policy, runtime-метрики та алерти.
4. 🟨 **Load-test Middle+ (фіналізація)** — запустити `comments-middle.js` у середовищі з увімкненим RabbitMQ/Elasticsearch, зберегти результати (summary/JSON, p95/p99, error-rate) у `docs/` і додати посилання в README.
5. 🔲 **Відео-демо в README** — записати і додати посилання/розділ «Demo».


## Оновлення ітерації 10

- ✅ Актуалізовано checklist після рев’ю репозиторію (`README`, `docs/`, `load-test/`): підтверджено, що критичні прогалини лишаються в Angular-міграції, CQRS-пайплайні та production-hardening RabbitMQ.
- ✅ Додано пріоритизований план доробок у форматі **P0/P1/P2** з конкретними артефактами приймання, щоб наступні ітерації були вимірювані.
- ✅ Уточнено очікувані deliverables для закриття Middle+ load-test (JSON summary + короткий звіт у `docs/` + посилання в README).

### Що ще треба зробити після ітерації 10

#### P0 — критично для відповідності ТЗ
1. 🔲 **Angular SPA (LTS) замість vanilla JS**
   - Мінімальний DoD: екран списку/таблиці, nested thread view, create/reply, preview, captcha, attachments preview, SignalR live-updates.
   - Артефакти: код у `src/Comments.Web`, інструкція запуску в README, smoke e2e-сценарій.
2. 🔲 **CQRS + MediatR + FluentValidation**
   - Мінімальний DoD: `AddComment`, `AddReply`, `GetCommentsPage`, `GetCommentTree`, `PreviewComment` як command/query handlers + валідатори + pipeline behavior для валідації/логування.
   - Артефакти: оновлений Application-шар, unit-тести для handlers/validators.

#### P1 — стабільність і експлуатація
3. 🔲 **Production-hardening RabbitMQ**
   - Мінімальний DoD: персистентна ідемпотентність (не in-memory), retry/backoff policy (delayed), метрики обробки та помилок.
   - Артефакти: конфіг політик, технічний опис у `docs/`, базові інтеграційні тести consumer-потоку.
4. 🟨 **Load-test Middle+ (фіналізація)**
   - Мінімальний DoD: прогін `load-test/comments-middle.js` у середовищі з RabbitMQ + Elasticsearch; збережений результат `summary.json` + короткий висновок (p95/p99/error-rate).
   - Артефакти: `docs/load-test-middle-results.md` + файл(и) метрик + посилання у README.

#### P2 — фіналізація поставки
5. 🔲 **Відео-демо в README**
   - Мінімальний DoD: 3–5 хв демонстрація ключових сценаріїв (create/reply, sort/page, attachments preview, realtime).
   - Артефакти: посилання на відео + секція `Demo` в README.


## Оновлення ітерації 11

- ✅ README доповнено явною командою запуску Middle+-сценарію з експортом артефакту `--summary-export=docs/artifacts/k6-middle-summary.json`.
- ✅ Додано шаблон результатів `docs/load-test-middle-results.md` для фіксації p95/p99/error-rate, середовища, конфігурації запуску та висновків.
- 🟨 Пункт фіналізації Middle+ load-test лишається **частково виконаним**: артефакт-формат і місце збереження визначені, але потрібен фактичний прогін у цільовому середовищі з заповненням звіту реальними метриками.

### Що ще треба зробити після ітерації 11

#### P0 — критично для відповідності ТЗ
1. 🔲 **Angular SPA (LTS) замість vanilla JS**
   - Мінімальний DoD: екран списку/таблиці, nested thread view, create/reply, preview, captcha, attachments preview, SignalR live-updates.
   - Артефакти: код у `src/Comments.Web`, інструкція запуску в README, smoke e2e-сценарій.
2. 🔲 **CQRS + MediatR + FluentValidation**
   - Мінімальний DoD: `AddComment`, `AddReply`, `GetCommentsPage`, `GetCommentTree`, `PreviewComment` як command/query handlers + валідатори + pipeline behavior для валідації/логування.
   - Артефакти: оновлений Application-шар, unit-тести для handlers/validators.

#### P1 — стабільність і експлуатація
3. 🔲 **Production-hardening RabbitMQ**
   - Мінімальний DoD: персистентна ідемпотентність (не in-memory), retry/backoff policy (delayed), метрики обробки та помилок.
   - Артефакти: конфіг політик, технічний опис у `docs/`, базові інтеграційні тести consumer-потоку.
4. 🟨 **Load-test Middle+ (фіналізація)**
   - Мінімальний DoD: прогін `load-test/comments-middle.js` у середовищі з RabbitMQ + Elasticsearch; збережений результат `summary.json` + короткий висновок (p95/p99/error-rate).
   - Артефакти: `docs/load-test-middle-results.md` + файл(и) метрик у `docs/artifacts/` + посилання у README.

#### P2 — фіналізація поставки
5. 🔲 **Відео-демо в README**
   - Мінімальний DoD: 3–5 хв демонстрація ключових сценаріїв (create/reply, sort/page, attachments preview, realtime).
   - Артефакти: посилання на відео + секція `Demo` в README.

## Оновлення ітерації 16

- ✅ Оновлено документацію продовження робіт: синхронізовано `README.md` і checklist щодо актуальних пріоритетів виконання ТЗ.
- ✅ Уточнено, що всі нові зміни в поточній фазі документуються в `docs/tz-compliance-checklist.md` як джерелі істини по прогресу та open items.
- 🟨 Зафіксовано статус «готовність до наступної реалізації»: функціональні доробки цієї ітерації не вносилися в код бізнес-логіки, натомість підготовлено оновлений план виконання.

### Що ще треба зробити після ітерації 16

#### P0 — критично для відповідності ТЗ
1. 🔲 **Angular SPA (LTS) замість vanilla JS**
   - Мінімальний DoD: екран списку/таблиці, nested thread view, create/reply, preview, captcha, attachments preview, SignalR live-updates.
   - Артефакти: код у `src/Comments.Web`, інструкція запуску в README, smoke e2e-сценарій.
2. 🔲 **CQRS + MediatR + FluentValidation**
   - Мінімальний DoD: `AddComment`, `AddReply`, `GetCommentsPage`, `GetCommentTree`, `PreviewComment` як command/query handlers + валідатори + pipeline behavior для валідації/логування.
   - Артефакти: оновлений Application-шар, unit-тести для handlers/validators.

#### P1 — стабільність і експлуатація
3. 🔲 **Production-hardening RabbitMQ**
   - Мінімальний DoD: персистентна ідемпотентність (не in-memory), delayed retry/backoff policy, runtime-метрики та алерти.
   - Артефакти: конфіг політик/черг, технічний опис у `docs/`, базові інтеграційні тести consumer-потоку.
4. 🟨 **Load-test Middle+ (фіналізація)**
   - Мінімальний DoD: прогін `load-test/comments-middle.js` у середовищі з RabbitMQ + Elasticsearch; збережений результат `summary.json` + короткий висновок (p95/p99/error-rate).
   - Артефакти: `docs/load-test-middle-results.md` + файл(и) метрик у `docs/artifacts/` + посилання у README.

#### P2 — фіналізація поставки
5. 🔲 **Відео-демо в README**
   - Мінімальний DoD: 3–5 хв демонстрація ключових сценаріїв (create/reply, sort/page, attachments preview, realtime).
   - Артефакти: посилання на відео + секція `Demo` в README.
