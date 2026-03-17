# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-17 (ітерація 62).

## Що перевірено в цій ітерації

- Посилено `RabbitMqTaskQueuesConsumerHostedService` runtime-спостережуваність:
  - додано .NET `Meter`-метрики `success/failed/retry/latency` для consumer-обробки;
  - додано теги `worker`, `outcome/reason/result` для базової діагностики без зміни бізнес-контрактів;
  - latency фіксується через `Stopwatch.GetElapsedTime(...)` для кожного повідомлення.
- Додано XML-коментарі до нових полів/методів consumer-сервісу (відповідно до вимоги документувати нові класи/методи).
- Оновлено backlog: блок `RabbitMQ hardening` частково просунувся (метрики додано), але персистентна ідемпотентність, alert-пороги й replay-runbook лишаються відкритими.

## Підсумок відповідності

- **Повністю виконано:** 34 пункти.
- **Частково виконано:** 3 пункти.
- **Не виконано:** 2 пункти.

> Висновок: **100% відповідності ТЗ ще немає**.

## Актуальний статус по ключових блоках ТЗ

1. ✅ **Backend / API** — виконано:
   - REST + GraphQL API, валідація, preview, captcha, вкладення, SignalR, Elasticsearch інтеграція, базовий RabbitMQ pipeline.
2. 🟨 **Архітектура (CQRS + MediatR + FluentValidation)** — частково:
   - основний каркас і обробники є, але лишаються edge-case доробки в тестах/контрактах та документації.
3. 🟨 **Frontend Angular LTS** — частково:
   - ключові user-flow реалізовані; уніфікацію validation UX для REST/GraphQL, transient/retry UX для load/captcha, preview fallback і SignalR reconnection-state виконано; лишається e2e smoke та частина boundary-документації.
4. 🟨 **RabbitMQ production-hardening** — частково:
   - є retry/DLQ базис і додано базові consumer-метрики (`success/fail/retry/latency`), але ще потрібні персистентна ідемпотентність, alert-пороги та replay-процедури.
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
   - додати мінімум 1 наскрізний Playwright/Cypress сценарій: create root comment -> reply -> перевірка відображення;
   - окремо зафіксувати attachment-flow (хоча б image або txt) у e2e;
   - додати команду запуску в README/CI notes.

3. **Middle+ load-test фактами (P0, ~1–2 год за готового стенду):**
   - прогнати `load-test/comments-middle.js` у контурі з RabbitMQ + Elasticsearch;
   - оновити `docs/load-test-middle-results.md` і `docs/artifacts/k6-middle-summary.json` реальними метриками.

### Фаза 2 — одразу після Фази 1 (stabilization)

4. **RabbitMQ hardening мінімум для тестування (P1):**
   - персистентна ідемпотентність (SQL/Redis);
   - мінімальні метрики consumer (success/fail/retry/latency) + базові пороги;
   - коротка replay-інструкція для DLQ у runbook.

5. **Go/No-Go для старту ручного QA:**
   - критерій `Go`: Demo-лінк + e2e smoke green + middle-load метрики зафіксовані;
   - після `Go` запускати повне ручне тестування по ТЗ.

## Що ще треба зробити у проєкті (лише актуальне)

### P0

1. **Frontend stabilization (Angular LTS):**
   - ✅ додано component smoke-тести для `root create`, `thread reply`, `preview fallback` та `realtime` UX-статусів;
   - ✅ unit smoke для attachment-flow додано (root + thread);
   - лишається додати browser e2e smoke (Playwright/Cypress) для реального runtime-сценарію, включно з `attachments`.

2. **Закриття edge-cases CQRS/Validation:**
   - ✅ додано mixed REST/GraphQL boundary-тести для sort/filter/pagination;
   - ✅ API/README доповнено прикладами boundary-помилок (`Page/PageSize`, `CaptchaToken`, attachment);
   - лишається невеликий e2e-smoke шар для фіксації цих контрактів на рівні UI (Angular).

### P1

3. **RabbitMQ hardening до production-ready:**
   - ✅ додано базові метрики consumer-обробки (`success/fail/retry/latency`) у RabbitMQ hosted service;
   - перенести ідемпотентність із in-memory у персистентне сховище (SQL/Redis);
   - додати базові alert-умови на нові метрики та задокументувати пороги;
   - формалізувати DLQ replay flow.

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
