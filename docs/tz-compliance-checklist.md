# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-17 (ітерація 55).

## Що перевірено в цій ітерації

- Для Angular SPA посилено `production-hardening UX` у сценаріях мережевих/timeout збоїв:
  - `RootListPageComponent`: завантаження root-коментарів тепер використовує `ApiErrorPresenterService`, додає retry-підказку для transient-помилок і явний статус-повідомлення при збої оновлення CAPTCHA.
  - `ThreadPageComponent`: завантаження гілки також переведено на уніфікований `ApiErrorPresenterService`, додано retry-підказку та обробку помилки перезавантаження CAPTCHA.
- Внесені зміни задокументовані в коді через inline/XML-коментарі на рівні нових/оновлених властивостей і методів відповідно до внутрішнього правила про документування.
- Checklist синхронізовано: P0-зона звужена до e2e smoke та фінальних edge-case UX/messages; P1/P2 без змін.

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
   - ключові user-flow реалізовані; уніфікацію validation UX для REST/GraphQL і transient/retry UX для load/captcha виконано; лишається e2e smoke та фінальний edge-case hardening.
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
   - довести до кінця production-hardening UX для решти edge-case повідомлень (зокрема fallback-сценаріїв preview та SignalR reconnection-state).

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
