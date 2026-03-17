# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-17 (ітерація 56).

## Що перевірено в цій ітерації

- Для Angular SPA закрито ще два edge-case UX-напрями з P0:
  - **Preview fallback:** у `RootListPageComponent` і `ThreadPageComponent` додано безпечний fallback, якщо `/preview` тимчасово недоступний — користувач отримує зрозуміле повідомлення, форма лишається працездатною, submit не блокується.
  - **SignalR reconnection-state:** у обох сторінках додано відображення станів realtime (`reconnecting`, `reconnected`, `onclose`, `initial start fail`) з явними повідомленнями та інструкціями для ручного оновлення даних.
- Збережено вимогу про документування: нові властивості/поведінка покриті inline/XML-коментарями.
- Checklist синхронізовано: у P0 залишаються e2e smoke та частина API/README boundary-документації; edge-case UX по preview/realtime переведено у виконане.

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
