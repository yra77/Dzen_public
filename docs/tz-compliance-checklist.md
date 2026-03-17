# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-17 (ітерація 73).

## Що перевірено в цій ітерації

- У `Comments.Web` додано новий Playwright runtime smoke-сценарій `thread realtime update in second tab`:
  - винесено helper `createRootCommentAndOpenThread(...)` для повторного використання create root-flow у runtime-тестах;
  - сценарій відкриває одну thread-сторінку у двох вкладках/контекстах браузера;
  - у другій вкладці створює reply (з captcha), а в першій перевіряє появу нового reply через realtime-оновлення (SignalR).
- Оновлено `src/Comments.Web/README.md`: блок `Наступні кроки міграції` синхронізовано з фактом, що create/reply та multi-tab realtime e2e вже реалізовано; відкритим лишається інтеграція smoke e2e у CI.
- Оновлено цей чекліст актуальним статусом: browser smoke покриває runtime create/reply + базовий multi-tab realtime flow; далі потрібно запустити це стабільно в CI/контурі з доступним npm registry mirror.

## Підсумок відповідності

- **Повністю виконано:** 37 пунктів.
- **Частково виконано:** 1 пункт.
- **Не виконано:** 1 пункт.

> Висновок: **100% відповідності ТЗ ще немає** (ключові блокери: middle+ load-test із фактами, demo-video URL; browser e2e smoke уже включає multi-tab realtime, лишається стабільний запуск у CI/середовищі з доступним npm mirror).

## Актуальний статус по ключових блоках ТЗ

1. ✅ **Backend / API** — виконано:
   - REST + GraphQL API, валідація, preview, captcha, вкладення, SignalR, Elasticsearch інтеграція, базовий RabbitMQ pipeline.
2. 🟨 **Архітектура (CQRS + MediatR + FluentValidation)** — частково:
   - основний каркас і обробники є, але лишаються edge-case доробки в тестах/контрактах та документації.
3. 🟨 **Frontend Angular LTS** — частково:
   - ключові user-flow реалізовані; уніфікацію validation UX для REST/GraphQL, transient/retry UX для load/captcha, preview fallback і SignalR reconnection-state виконано; додано test-target для `ng test`; Playwright smoke покриває runtime create/reply і multi-tab realtime; лишається інтеграція e2e у CI та частина boundary-документації.
4. ✅ **RabbitMQ production-hardening** — виконано:
   - є retry/DLQ базис, базові consumer-метрики (`success/fail/retry/latency`) та persistent-ідемпотентність із cleanup-процедурою;
   - додано alert-пороги для `failure-rate/latency` та формалізований `DLQ replay-flow` у runbook.
5. ❌ **Фінальний Middle+ load-test у цільовому контурі RabbitMQ + Elasticsearch** — не виконано:
   - у `docs/load-test-middle-results.md` лишається шаблон без фактичних метрик.
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
   - ✅ зафіксовано txt-attachment-flow в e2e; лишається image-attachment та додавання запуску в CI notes/pipeline.

3. **Middle+ load-test фактами (P0, ~1–2 год за готового стенду):**
   - прогнати `load-test/comments-middle.js` у контурі з RabbitMQ + Elasticsearch;
   - оновити `docs/load-test-middle-results.md` і `docs/artifacts/k6-middle-summary.json` реальними метриками.

### Фаза 2 — одразу після Фази 1 (stabilization)

4. **RabbitMQ hardening мінімум для тестування (P1):**
   - ✅ персистентна ідемпотентність (EF/SQL) + cleanup старих id;
   - ✅ мінімальні метрики consumer (success/fail/retry/latency) додано;
   - ✅ визначено базові alert-пороги та додано коротку replay-інструкцію для DLQ у runbook.

5. **Go/No-Go для старту ручного QA:**
   - критерій `Go`: Demo-лінк + e2e smoke green + middle-load метрики зафіксовані;
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
   - лишається інтеграція e2e в CI;
   - лишається розблокувати npm registry доступ у середовищі, щоб дотягнути `karma*` і `@playwright/test` пакети та виконувати `npm test`/`npm run e2e:smoke` у CI/локально без manual bootstrap.

2. **Закриття edge-cases CQRS/Validation:**
   - ✅ додано unit coverage для `ApiErrorPresenterService` (REST/GraphQL validation mapping + transient retry + unknown fallback);
   - ✅ додано mixed REST/GraphQL boundary-тести для sort/filter/pagination;
   - ✅ API/README доповнено прикладами boundary-помилок (`Page/PageSize`, `CaptchaToken`, attachment);
   - ✅ додано backend boundary-валідацію і integration coverage для `attachment > 1MB` (REST + GraphQL);
   - ✅ додано позитивні boundary integration-тести для `attachment == 1MB` (REST + GraphQL);
   - ✅ додано негативні attachment edge-case тести: REST (`invalid content-type`) та GraphQL (`invalid base64`);
   - лишається невеликий e2e-smoke шар для фіксації цих контрактів на рівні UI (Angular).

### P1

3. **RabbitMQ hardening до production-ready:**
   - ✅ додано базові метрики consumer-обробки (`success/fail/retry/latency`) у RabbitMQ hosted service;
   - ✅ персистентна ідемпотентність реалізована через `ProcessedMessages` + додано cleanup-hosted-service;
   - ✅ додано базові alert-умови та задокументовано пороги;
   - ✅ формалізовано DLQ replay flow (`docs/rabbitmq-consumer-runbook.md`).

4. **Фіналізувати Middle+ load-test:**
   - виконати реальний прогін `load-test/comments-middle.js` у середовищі з RabbitMQ + Elasticsearch;
   - оновити `docs/load-test-middle-results.md` фактичними показниками p95/p99/error-rate;
   - додати/оновити актуальний артефакт `docs/artifacts/k6-middle-summary.json`.

### P2

5. **Закрити delivery-пакет:**
   - ✅ секцію `Demo` у `README.md` додано;
   - додати фактичне посилання на 3–5 хв відео ключових сценаріїв (замість `TODO`).

---

Цей файл є єдиним актуальним чеклістом відповідності ТЗ. Історія попередніх ітерацій ведеться в git.
