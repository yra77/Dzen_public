# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-17 (ітерація 79).

## Що перевірено в цій ітерації

- Закрито наступний інтеграційний edge-case для контракту валідації API middleware/error-filter (`src/Comments.Api.Tests/ValidationIntegrationTests.cs`):
  - додано REST-тест `CreateComment_WithMultipleInvalidFields_ReturnsAggregatedValidationProblem`, який перевіряє агрегацію множинних помилок у `ValidationProblemDetails`;
  - додано GraphQL-тест `GraphQlCreateComment_WithMultipleInvalidFields_ReturnsAggregatedValidationErrorsExtension`, який перевіряє агрегацію множинних помилок у `extensions.validationErrors` з кодом `BAD_USER_INPUT`.
- Для нових тестових методів додано XML-коментарі згідно вимоги про документування нових/змінених класів і методів.
- Оновлено чекліст: зафіксовано виконану доробку і уточнено наступний крок — завершити delivery-пакет підстановкою фактичного demo-video URL у `README.md`.

## Підсумок відповідності

- **Повністю виконано:** 38 пунктів.
- **Частково виконано:** 1 пункт.
- **Не виконано:** 0 пунктів (пункт №5 виключено з обов'язкових за запитом).

> Висновок: browser smoke уже інтегрований у CI (GitHub Actions) та покриває create/reply + multi-tab realtime + image attachment; для фінального закриття delivery-пакету лишається підставити фактичний demo-video URL у `README.md`.

> Додатково: у поточному середовищі розробки відтворення e2e локально обмежене мережевою забороною на npm registry (`E403` для `@playwright/test` під час `npm ci`), тому перевірка ефекту фіксу очікується у GitHub Actions.

## Актуальний статус по ключових блоках ТЗ

1. ✅ **Backend / API** — виконано:
   - REST + GraphQL API, валідація, preview, captcha, вкладення, SignalR, Elasticsearch інтеграція, базовий RabbitMQ pipeline.
2. 🟨 **Архітектура (CQRS + MediatR + FluentValidation)** — частково:
   - основний каркас і обробники є, але лишаються edge-case доробки в тестах/контрактах та документації.
3. 🟨 **Frontend Angular LTS** — частково:
   - ключові user-flow реалізовані; уніфікацію validation UX для REST/GraphQL, transient/retry UX для load/captcha, preview fallback і SignalR reconnection-state виконано; додано test-target для `ng test`; Playwright smoke покриває runtime create/reply, multi-tab realtime, image attachment та UI-boundary attachment-validation; інтеграцію e2e у CI виконано; з незакритого лишається лише частина boundary-документації.
4. ✅ **RabbitMQ production-hardening** — виконано:
   - є retry/DLQ базис, базові consumer-метрики (`success/fail/retry/latency`) та persistent-ідемпотентність із cleanup-процедурою;
   - додано alert-пороги для `failure-rate/latency` та формалізований `DLQ replay-flow` у runbook.
5. ⏭️ **Фінальний Middle+ load-test у цільовому контурі RabbitMQ + Elasticsearch** — виключено з обов'язкових за поточним запитом:
   - пункт не блокує закриття поточного етапу робіт.
6. 🟨 **Delivery-артефакт Demo (README + відео)** — частково виконано:
   - у `README.md` додано секцію `Demo`;
   - лишається замінити `TODO` на фактичний лінк на 3–5 хв запис ключових сценаріїв.


## Прискорений план завершення проєкту (щоб швидко перейти до QA)

### Фаза 1 — сьогодні (блокери до старту тестування)

1. **Demo-артефакт (P0, ~30–60 хв):**
   - записати 3–5 хв відео сценаріїв: root list, create, reply у thread, preview, captcha, attachment, realtime update;
   - завантажити відео (YouTube unlisted/Drive) і підставити URL в `README.md` у секцію `Demo`.

2. **Browser e2e smoke (P0, ~2–4 год):**
   - ✅ додано Playwright smoke-каркас + команду запуску в `src/Comments.Web/README.md`;
   - ✅ сценарій розширено до наскрізного `create root -> reply -> verify` з інтеракцією captcha;
   - ✅ додано multi-tab realtime smoke (SignalR) між двома вкладками;
   - ✅ зафіксовано txt-attachment-flow в e2e;
   - ✅ додано image-attachment smoke (PNG preview) у runtime e2e;

3. **Middle+ load-test фактами (P0)** — ⏭️ виключено з обов'язкових за поточним запитом.

### Фаза 2 — одразу після Фази 1 (stabilization)

4. **RabbitMQ hardening мінімум для тестування (P1):**
   - ✅ персистентна ідемпотентність (EF/SQL) + cleanup старих id;
   - ✅ мінімальні метрики consumer (success/fail/retry/latency) додано;
   - ✅ визначено базові alert-пороги та додано коротку replay-інструкцію для DLQ у runbook.

5. **Go/No-Go для старту ручного QA:**
   - критерій `Go`: Demo-лінк + e2e smoke green;
   - після `Go` запускати повне ручне тестування по ТЗ.

## Що ще треба зробити у проєкті (лише актуальне)

### P0

1. **Frontend stabilization (Angular LTS):**
   - ✅ додано component smoke-тести для `root create`, `thread reply`, `preview fallback` та `realtime` UX-статусів;
   - ✅ unit smoke для attachment-flow додано (root + thread);
   - ✅ додано додаткові smoke/unit тести на boundary attachment (size/type) для root і thread сценаріїв;
   - ✅ підключено test target + Karma/Jasmine конфігурацію (`angular.json`, `tsconfig.spec.json`, `src/test.ts`, `karma.conf.cjs`) для регулярного запуску `ng test`;
   - ✅ додано browser e2e smoke-каркас (Playwright) і стабільні `data-testid` селектори у root/thread шаблонах;
   - ✅ розширено smoke до runtime-сценарію `create/reply` з captcha та txt attachment;
   - ✅ додано e2e-перевірку realtime оновлень між двома вкладками (SignalR);
   - ✅ додано runtime e2e-перевірку image attachment preview (PNG thumbnail + file link) у root-list;
   - ✅ додано runtime e2e boundary-перевірки UI-валидації attachment (`>1MB`, `unsupported MIME`) для root/thread форм;
   - ✅ інтегровано e2e smoke у CI через GitHub Actions workflow `comments-web-e2e-smoke.yml`;
   - лишається розблокувати npm registry доступ у частині локальних/закритих середовищ, де без internal mirror неможливо виконувати `npm test`/`npm run e2e:smoke` без manual bootstrap.

2. **Закриття edge-cases CQRS/Validation:**
   - ✅ додано unit coverage для `ApiErrorPresenterService` (REST/GraphQL validation mapping + transient retry + unknown fallback);
   - ✅ додано mixed REST/GraphQL boundary-тести для sort/filter/pagination;
   - ✅ API/README доповнено прикладами boundary-помилок (`Page/PageSize`, `CaptchaToken`, attachment);
   - ✅ додано backend boundary-валідацію і integration coverage для `attachment > 1MB` (REST + GraphQL);
   - ✅ додано позитивні boundary integration-тести для `attachment == 1MB` (REST + GraphQL);
   - ✅ додано негативні attachment edge-case тести: REST (`invalid content-type`) та GraphQL (`invalid base64`);
   - ✅ додано e2e-smoke UI-фіксацію boundary-контрактів attachment на Angular-рівні (`>1MB`, `unsupported MIME`).
   - ✅ додано інтеграційні тести агрегації множинних validation-помилок через REST middleware та GraphQL error-filter.


### P1

3. **RabbitMQ hardening до production-ready:**
   - ✅ додано базові метрики consumer-обробки (`success/fail/retry/latency`) у RabbitMQ hosted service;
   - ✅ персистентна ідемпотентність реалізована через `ProcessedMessages` + додано cleanup-hosted-service;
   - ✅ додано базові alert-умови та задокументовано пороги;
   - ✅ формалізовано DLQ replay flow (`docs/rabbitmq-consumer-runbook.md`).

4. **Фіналізувати Middle+ load-test:**
   - ⏭️ виключено з обов'язкових у межах поточного запиту (пункт №5 чекліста).

### P2

5. **Закрити delivery-пакет:**
   - ✅ секцію `Demo` у `README.md` додано;
   - додати фактичне посилання на 3–5 хв відео ключових сценаріїв (замість `TODO`).

---

Цей файл є єдиним актуальним чеклістом відповідності ТЗ. Історія попередніх ітерацій ведеться в git.
