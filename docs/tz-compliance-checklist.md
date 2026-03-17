# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-17 (ітерація 58).

## Що перевірено в цій ітерації

- Для P0-напряму **"edge-cases CQRS/Validation"** додано нові інтеграційні mixed boundary-тести для `comments` (REST + GraphQL):
  - **REST trim + filter + sort boundary:** `GetComments_WithTrimmedFilterAndEmailSort_ReturnsEmailMatchedItemsInOrder` перевіряє trim фільтра (`%20marker%20`), фільтрацію по тексту та сортування за `Email Desc`.
  - **GraphQL mixed pagination boundary:** `GraphQlComments_WithTextFilterAndSecondPage_ReturnsSingleExpectedItem` фіксує контракт для `comments(page:2,pageSize:2,sortBy:UserName,sortDirection:Asc,filter:<token>)` з очікуваним single-item slice на другій сторінці.
- Дотримано вимогу документування: нові тестові методи додані з XML-коментарями.
- Доповнено `README.md` прикладами boundary-помилок для `Page/PageSize`, `CaptchaToken` та `Attachment` (REST/GraphQL), як і вимагалось у backlog P0.
- Checklist синхронізовано з фактичним станом: по edge-cases лишається e2e smoke (frontend/realtime) та production-блоки RabbitMQ/load-test/Demo.

## Підсумок відповідності

- **Повністю виконано:** 33 пункти.
- **Частково виконано:** 1 пункт.
- **Не виконано:** 3 пункти.

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
6. ❌ **Delivery-артефакт Demo (README + відео)** — не виконано:
   - у `README.md` відсутня секція `Demo` з посиланням на запис сценаріїв.

## Що ще треба зробити у проєкті (лише актуальне)

### P0

1. **Frontend stabilization (Angular LTS):**
   - додати e2e smoke для сценаріїв: `root create`, `thread reply`, `preview`, `attachments`, `realtime`;
   - додати smoke-перевірку UX-статусів realtime reconnect (щоб зафіксувати новий fallback у автоперевірках).

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
   - додати секцію `Demo` у `README.md`;
   - додати посилання на 3–5 хв відео ключових сценаріїв.

---

Цей файл є єдиним актуальним чеклістом відповідності ТЗ. Історія попередніх ітерацій ведеться в git.
