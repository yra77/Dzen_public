# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-17 (ітерація 54).

## Що перевірено в цій ітерації

- У `Comments.Api.Infrastructure` додано XML-коментарі для каналів публікації подій створення коментарів: `ICommentCreatedChannel`, `CompositeCommentCreatedPublisher`, `SignalRCommentCreatedChannel`, `ElasticsearchCommentCreatedChannel`, `RabbitMqCommentCreatedPublisher`, `NoOpCommentCreatedPublisher`, `NoOpCommentSearchService` (класи/інтерфейси, конструктори, публічні методи).
- Зафіксовано, що поточний backlog по ТЗ залишається незмінним: P0 — frontend stabilization + CQRS edge-cases, P1 — RabbitMQ hardening + middle load-test, P2 — Demo delivery-артефакт.
- Checklist оновлено як єдине джерело актуального прогресу по відповідності ТЗ.

## Підсумок відповідності

- **Повністю виконано:** 32 пункти.
- **Частково виконано:** 2 пункти.
- **Не виконано:** 3 пункти.

> Висновок: **100% відповідності ТЗ ще немає**.

## Актуальний статус по ключових блоках ТЗ

1. ✅ **Backend / API** — виконано:
   - REST + GraphQL API, валідація, preview, captcha, вкладення, SignalR, Elasticsearch інтеграція, базовий RabbitMQ pipeline.
2. 🟨 **Архітектура (CQRS + MediatR + FluentValidation)** — частково:
   - основний каркас і обробники є, але лишаються edge-case доробки в тестах/контрактах та документації.
3. 🟨 **Frontend Angular LTS** — частково:
   - ключові user-flow реалізовані; уніфікацію validation UX для REST/GraphQL виконано; лишається e2e smoke та загальний production-hardening.
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
   - виконати production-hardening UX (retry-state, edge-case повідомлення для мережевих/timeout збоїв).

2. **Закриття edge-cases CQRS/Validation:**
   - додати інтеграційні кейси для mixed `commentTree` sort/filter boundary-сценаріїв;
   - доповнити API/README прикладами boundary-помилок (`Page/PageSize`, `CaptchaToken`, attachment).

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
