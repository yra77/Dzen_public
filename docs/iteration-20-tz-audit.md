# Ітерація 20 — перевірка відповідності ТЗ (операційний аудит)

Останнє оновлення: 2026-03-16.

## Що зроблено в цій ітерації

1. Проведено повторну звірку стану репозиторію з вимогами ТЗ на основі наявного чекліста та фактичної структури коду.
2. Зафіксовано короткий статус «виконано / частково / не виконано» для продовження робіт без повторного повного аудиту.
3. Сформовано конкретний next-steps backlog у порядку реалізації.

## Швидкий результат перевірки ТЗ

- ✅ **Backend/API базові вимоги**: виконано (REST, GraphQL, SignalR, RabbitMQ публікація/consumer-базис, Elasticsearch, валідації форми, вкладення).
- 🟨 **Архітектурний блок**: частково (Clean Architecture загалом є, але повноцінний CQRS+MediatR+FluentValidation ще не завершено).
- ❌ **Frontend-стек за ТЗ**: не виконано повністю (Angular LTS SPA ще не мігровано; активний клієнт — vanilla JS у `src/Comments.Api/wwwroot`).
- ❌ **Delivery-артефакти**: відсутні demo-відео та фінальний Middle+ прогін у цільовому середовищі RabbitMQ+Elasticsearch.

## Чи дотримуємося всіх пунктів ТЗ?

**Ні, наразі 100% відповідності ТЗ немає.**

Поточний статус (актуалізовано):
- **Повністю виконано:** 32
- **Частково виконано:** 2
- **Не виконано:** 3

## Що ще треба зробити у проєкті (пріоритетно)

### P0 (критично)
1. Завершити Angular LTS migration у `src/Comments.Web` (роути, список/дерево, create/reply, preview, captcha, attachments, realtime).
2. Завершити CQRS + MediatR + FluentValidation у `src/Comments.Application`/`src/Comments.Api` без зміни зовнішніх API-контрактів.

### P1 (стабілізація)
3. Доробити RabbitMQ hardening: персистентна ідемпотентність, retry/backoff + DLQ/replay, метрики обробки.
4. Виконати фінальний `load-test/comments-middle.js` у середовищі RabbitMQ+Elasticsearch та оновити `docs/load-test-middle-results.md` + `docs/artifacts`.

### P2 (поставка)
5. Додати Demo-секцію у README з посиланням на 3–5 хвилинне відео.

## Рекомендований порядок наступних комітів

1. `feat(web): scaffold angular lts app and routing`
2. `feat(web): migrate comment list/form/captcha/attachments/realtime`
3. `refactor(app): introduce mediatr commands and queries`
4. `feat(app): add fluentvalidation and pipeline behaviors`
5. `chore(infra): add persistent idempotency with retry/dlq metrics`
6. `test(load): publish middle-profile summary from rabbitmq+elasticsearch environment`
7. `docs(readme): add demo section and acceptance links`
