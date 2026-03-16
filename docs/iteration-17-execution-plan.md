# Ітерація 17 — план виконання до 100% відповідності ТЗ

Останнє оновлення: 2026-03-16.

## Що зафіксовано в цій ітерації

- Зібрано практичний **execution plan** на найближчі коміти без зміни зовнішніх контрактів API.
- Декомпозовано два P0-блокери (Angular LTS + CQRS/MediatR/FluentValidation) до рівня задач «зробив/перевірив/задокументував».
- Додано контрольний список артефактів приймання, щоб швидко підтвердити прогрес у `README.md` і `docs/tz-compliance-checklist.md`.

---

## P0-1: Angular LTS migration (`src/Comments.Web`)

### Мінімальний scope (must-have)

1. Створити Angular shell:
   - `app-routing` з маршрутами `/` (root list) і `/thread/:id` (гілка);
   - базовий layout + контейнери під table/tree/form.
2. Перенести поточну функціональність з `wwwroot`:
   - list/sort/pagination;
   - create/reply;
   - preview коментаря;
   - CAPTCHA image challenge;
   - attachments upload + preview;
   - SignalR live updates.
3. Додати конфіг API-режиму (`rest`/`graphql`) через environment.

### Критерії готовності

- Root-коментарі рендеряться таблицею, nested-view працює без reload.
- Створення root/reply працює в обох режимах (`rest`, `graphql`).
- Realtime подія `commentCreated` додає новий елемент у UI.
- README містить оновлену інструкцію запуску Angular-клієнта.

---

## P0-2: CQRS + MediatR + FluentValidation

### Мінімальний scope (must-have)

1. Винести use-cases у handlers:
   - `AddCommentHandler`;
   - `AddReplyHandler`;
   - `GetCommentsPageHandler`;
   - `GetCommentTreeHandler`;
   - `PreviewCommentHandler`.
2. Додати validators:
   - поля форми (`UserName`, `Email`, `HomePage`, `Text`);
   - business rules для reply (існування parent, заборона циклів).
3. Додати pipeline behaviors:
   - validation behavior;
   - logging/telemetry behavior.

### Критерії готовності

- REST/GraphQL контракти не змінені (зворотна сумісність збережено).
- Юніт-тести закривають handlers/validators для happy-path і валідаційних помилок.
- Логи/telemetry фіксують команду, час виконання, результат.

---

## P1: Production hardening (після P0)

1. RabbitMQ idempotency store (SQL/Redis замість in-memory).
2. Метрики consumer-обробки:
   - `consumer_success_total`, `consumer_failure_total`, `consumer_retry_total`;
   - latency histogram per queue.
3. Інтеграційний сценарій retry → DLQ + runbook replay процедури.

---

## P1: Middle+ load test (фінал)

1. Запустити `load-test/comments-middle.js` у профілі `mixed` з увімкненими RabbitMQ+Elasticsearch.
2. Зберегти `docs/artifacts/k6-middle-summary.json`.
3. Заповнити `docs/load-test-middle-results.md` фактичними p95/p99/error-rate.

---

## P2: Delivery

1. Записати demo-відео 3–5 хв: create/reply, sort/pagination, attachments preview, realtime.
2. Додати секцію `Demo` у README з посиланням.

---

## Suggested order of next commits

1. `feat(web): scaffold angular app + routing + base layout`
2. `feat(web): migrate comments list/form/preview/captcha/attachments`
3. `feat(web): add signalr realtime + rest/graphql data mode`
4. `refactor(api): introduce mediatr commands/queries + handlers`
5. `feat(api): add fluentvalidation + pipeline behaviors + tests`
6. `chore(rabbitmq): persistent idempotency + consumer metrics + retry/dlq test`
7. `test(load): run middle profile and publish k6 summary`
8. `docs(readme): add demo section and final acceptance artifacts`
