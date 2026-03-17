# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-17 (ітерація 61).

## Що перевірено в цій ітерації

- Розширено Angular smoke unit-тести для attachment-flow:
  - `root-list`: перевірка, що `attachment` (txt) потрапляє у payload `POST /api/comments`.
  - `thread-page`: перевірка, що reply із `attachment` (txt) коректно відправляється у create payload.
- Оновлено статус browser e2e smoke: спроба встановити Playwright (`@playwright/test`) заблокована політикою доступу до npm registry (`403 Forbidden`), тому e2e лишається відкритим P0-пунктом.
- Синхронізовано backlog у цьому чеклісті з урахуванням нових unit smoke покриттів та незакритого e2e-блоку.

## Підсумок відповідності

- **Повністю виконано:** 33 пункти.
- **Частково виконано:** 2 пункти.
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
   - є retry/DLQ базис, але ще потрібні персистентна ідемпотентність, метрики та replay-процедури.
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
   - перенести ідемпотентність із in-memory у персистентне сховище (SQL/Redis);
   - додати метрики consumer-обробки (`success/fail/retry/latency`) і базові alert-умови;
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
