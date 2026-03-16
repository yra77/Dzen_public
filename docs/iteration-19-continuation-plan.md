# Ітерація 19 — continuation plan (оновлення після delivery-плану)

Останнє оновлення: 2026-03-16.

## Що внесено в цій ітерації

1. Зафіксовано окремий continuation-документ з коротким operational backlog, щоб продовжувати роботу без повторного аудиту PDF/README.
2. Синхронізовано формулювання «що зроблено / що далі» між `README.md`, `docs/tz-compliance-checklist.md` та цим планом.
3. Уточнено найближчий commit-order для P0/P1/P2 з expected artifacts по кожному кроку.

---

## Що ще треба зробити у проєкті

### P0 — критично для 100% відповідності ТЗ

1. **Angular LTS migration (`src/Comments.Web`)**
   - Створити Angular app-shell та роутинг (`/`, `/thread/:id`).
   - Перенести поточний SPA-функціонал з `src/Comments.Api/wwwroot`:
     - список/дерево коментарів;
     - create/reply + preview;
     - captcha challenge;
     - preview/upload вкладень;
     - SignalR live updates.
   - Зберегти data mode parity (`REST/GraphQL`) через environment-конфіг.
   - **Артефакти приймання:** e2e smoke (`create root -> create reply -> realtime update`) + оновлені інструкції запуску фронтенду.

2. **CQRS + MediatR + FluentValidation (`src/Comments.Application`, `src/Comments.Api`)**
   - Розкласти use-cases на `Commands/Queries/Handlers`.
   - Додати FluentValidation validators для DTO/commands.
   - Підключити pipeline behaviors (validation + logging + telemetry hooks).
   - **Артефакти приймання:** unit-тести handlers/validators + підтвердження незмінності зовнішніх REST/GraphQL контрактів.

### P1 — production hardening

3. **RabbitMQ reliability hardening**
   - Ідемпотентність: перейти з in-memory на персистентне сховище (SQL/Redis).
   - Retry strategy: delayed retry + DLQ + replay procedure.
   - Метрики: success/failure/retry counters і consumer latency.
   - **Артефакти приймання:** оновлений runbook + інтеграційний сценарій `retry -> DLQ -> replay`.

4. **Middle+ load-test (фіналізація)**
   - Виконати `load-test/comments-middle.js` у середовищі з `RabbitMQ + Elasticsearch`.
   - Оновити `docs/artifacts/k6-middle-summary.json`.
   - Занести фактичні p95/p99/error-rate у `docs/load-test-middle-results.md`.

### P2 — delivery

5. **Demo-артефакт**
   - Записати 3–5 хв відео ключових сценаріїв.
   - Додати секцію `Demo` в `README.md` з посиланням.

---

## Рекомендований порядок наступних комітів

1. `feat(web): scaffold angular lts shell and routes`
2. `feat(web): migrate comments list/form/captcha/preview/attachments`
3. `feat(web): wire signalr and rest/graphql mode parity`
4. `refactor(app): introduce mediatr commands/queries/handlers`
5. `feat(app): add fluentvalidation + pipeline behaviors`
6. `chore(infra): implement persistent idempotency and retry/dlq metrics`
7. `test(load): run middle profile and publish summary artifact`
8. `docs(readme): add demo section with acceptance links`
