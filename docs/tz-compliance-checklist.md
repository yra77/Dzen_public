# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-17 (ітерація 50).

## Що перевірено в цій ітерації

- У шарі `Comments.Application` додано XML-коментарі до абстракцій (`IAttachmentStorage`, `ICaptchaValidator`, `ICommentCreatedPublisher`, `ICommentSearchService`, `IProcessedMessageRepository`, `ITextSanitizer`) і record-моделі `StoredAttachment`.
- Додано XML-коментарі до DTO моделей пагінації та сортування (`PagedResult`, `CommentSortField`, `CommentSortDirection`) для явної фіксації контрактів API/запитів.
- Додано XML-коментарі до CQRS preview-ланцюжка (`PreviewCommentQuery`, `PreviewCommentQueryHandler`, `PreviewCommentQueryValidator`) та уточнено, що в P0/P1/P2 залишаються попередні пріоритети (e2e smoke, RabbitMQ hardening, middle+ load-test, demo-пакет).
- У доменних моделях `Comment` і `ProcessedMessage` додано XML-коментарі до класів, конструкторів, властивостей та публічних методів для кращої підтримки контрактів доменної логіки.
- У GraphQL-шарі додано XML-коментарі до input-моделей (`CreateCommentInput`, `AddReplyInput`, `AttachmentInput`) та mutation/query-резолверів (`CommentQueries`, `CommentMutations`).
- Актуалізовано цей checklist: зафіксовано виконані кроки з коментування класів/методів/моделей і підтверджено, що пріоритети P0/P1/P2 залишаються без змін.

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
