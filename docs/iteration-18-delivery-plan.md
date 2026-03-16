# Ітерація 18 — delivery plan до фінального закриття ТЗ

Останнє оновлення: 2026-03-16.

## Мета ітерації

Підготувати проєкт до етапу фінального приймання: закрити P0-блокери (Angular LTS + CQRS/MediatR/FluentValidation), довести P1-артефакти (RabbitMQ hardening + Middle+ load test) і сформувати P2-delivery артефакт (Demo).

---

## Що зроблено в цій ітерації

1. Синхронізовано документаційний контур (`README.md`, `docs/tz-compliance-checklist.md`) із фокусом «що ще треба зробити».
2. Додано цей delivery-план як операційний документ для наступних комітів.
3. Зафіксовано критерії завершення робіт по кожному пріоритету (P0/P1/P2).

---

## Що ще треба зробити у проєкті

### P0 — must-have до 100% відповідності ТЗ

1. **Angular LTS migration (`src/Comments.Web`)**
   - Підняти Angular shell і маршрути `/` та `/thread/:id`.
   - Перенести функції поточного SPA: list/tree, sorting/pagination, create/reply, preview, captcha, attachments preview/upload, SignalR live updates.
   - Зберегти підтримку data mode `rest/graphql` через environment-конфіг.
   - **DoD:** e2e smoke: `create root -> create reply -> realtime update` без reload.

2. **CQRS + MediatR + FluentValidation (`src/Comments.Api` + `src/Comments.Application`)**
   - Винести use-cases в handlers (commands/queries).
   - Додати validators на вхідні DTO/commands.
   - Додати pipeline behaviors (validation/logging/telemetry).
   - **DoD:** зовнішні REST/GraphQL контракти не змінені, unit-тести на handlers/validators проходять.

### P1 — production readiness

3. **RabbitMQ hardening**
   - Перенести idempotency store з in-memory у персистентне сховище (SQL/Redis).
   - Додати метрики consumer-обробки (success/failure/retry + latency).
   - Формалізувати інтеграційний сценарій `retry -> DLQ -> replay`.

4. **Final Middle+ load test**
   - Прогнати `load-test/comments-middle.js` у середовищі з увімкненими RabbitMQ + Elasticsearch.
   - Оновити `docs/artifacts/k6-middle-summary.json`.
   - Зафіксувати метрики у `docs/load-test-middle-results.md`.

### P2 — delivery

5. **Demo-артефакт**
   - Записати 3–5 хв відео по ключових сценаріях.
   - Додати секцію `Demo` у `README.md` з посиланням.

---

## Рекомендований порядок наступних комітів

1. `feat(web): scaffold angular lts app and routing`
2. `feat(web): migrate list/form/preview/captcha/attachments`
3. `feat(web): add signalr + rest/graphql mode parity`
4. `refactor(api): introduce mediatr handlers for comments use-cases`
5. `feat(api): add fluentvalidation and pipeline behaviors`
6. `chore(rabbitmq): persistent idempotency and consumer metrics`
7. `test(load): execute middle+ profile and publish artifacts`
8. `docs(readme): add demo section and acceptance links`

---

## Acceptance checklist for final iteration

- [ ] Angular SPA LTS у `src/Comments.Web` забезпечує функціональний паритет із поточним SPA.
- [ ] CQRS/MediatR/FluentValidation впроваджено без breaking changes для API.
- [ ] RabbitMQ consumer-ланцюг має персистентну ідемпотентність і базові метрики.
- [ ] Middle+ load-test артефакти оновлено і задокументовано.
- [ ] `README.md` містить Demo-посилання та актуальні acceptance-артефакти.
