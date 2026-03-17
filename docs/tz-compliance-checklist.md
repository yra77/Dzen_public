# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-17 (ітерація 85).

## Підсумок перевірки відповідності ТЗ

- ✅ **Усі обовʼязкові пункти ТЗ виконані.**
- ⏭️ **Пункти №5 та №6 чекліста** (Middle+ load-test та demo-артефакт) **виключені з обовʼязкових** за вашим запитом і не блокують старт тестування.
- ✅ Реалізація покриває backend/API, frontend, CQRS+MediatR+FluentValidation, realtime (SignalR), пошук/індексацію, RabbitMQ pipeline та CI smoke-перевірки.

> Висновок: проєкт готовий до вашого ручного тестування по ТЗ без очікування робіт із пунктів 5 та 6.

## Актуальний статус по ключових блоках ТЗ

1. ✅ **Backend / API** — виконано:
   - REST + GraphQL API;
   - валідація, preview, captcha, вкладення;
   - SignalR push-оновлення;
   - Elasticsearch інтеграція;
   - RabbitMQ publisher/consumer базис.

2. ✅ **Архітектура (CQRS + MediatR + FluentValidation)** — виконано:
   - каркас CQRS, handlers, validation pipeline;
   - edge-case покриття (включно з cancellation token).

3. ✅ **Frontend Angular LTS** — виконано:
   - root/thread create/reply, preview, captcha, attachment flows;
   - обробка validation/transient UX;
   - realtime оновлення і стани reconnection;
   - unit/component tests + e2e smoke (Playwright), включно з multi-tab та attachment boundary.

4. ✅ **RabbitMQ production-hardening (мінімально необхідний для QA)** — виконано:
   - retry/DLQ базис;
   - consumer метрики (`success/fail/retry/latency`);
   - persistent idempotency + cleanup;
   - alert-пороги і DLQ replay-flow у runbook.

5. ⏭️ **Пункт №5 (Middle+ load-test)** — не обовʼязковий.
6. ⏭️ **Пункт №6 (Demo-артефакт)** — не обовʼязковий.

## Швидкий план завершення перед стартом вашого тестування

### Фаза 1 (сьогодні, 1–2 години)

1. **Go/No-Go прогін (P0):**
   - прогнати backend tests;
   - прогнати frontend unit tests;
   - прогнати Playwright smoke.

2. **Тестовий стенд для вас (P0):**
   - підняти docker-compose (db + rabbitmq + elasticsearch);
   - перевірити health endpoint API;
   - перевірити, що UI відкривається і авторизаційні/мережеві налаштування для вашого середовища коректні.

### Фаза 2 (перед передачею в QA, ~30 хв)

3. **Фіксація білду (P1):**
   - зафіксувати commit/tag, на якому пройшли smoke перевірки;
   - коротко зафіксувати команди запуску для ручного тестування.

4. **Передача в тестування (P0):**
   - надати вам статус `Go`;
   - запускати повне ручне тестування по ТЗ.


## Оновлення в ітерації 84

- ✅ Додано автоматизований Go/No-Go скрипт `scripts/go-no-go-check.sh`, який послідовно запускає backend tests, frontend unit tests та Playwright e2e smoke.
- ✅ Уточнено крок передачі в QA: перед передачею використовувати єдину команду `./scripts/go-no-go-check.sh` для відтворюваного smoke-прогону.


## Оновлення в ітерації 85

- ✅ Додано endpoint готовності `GET /health` у `Comments.Api` для швидкої перевірки доступності API у локальному QA-стенді.
- ✅ Додано скрипт `scripts/qa-stand-check.sh`, який піднімає `docker compose` сервіси та перевіряє доступність API/RabbitMQ/Elasticsearch з retry-політикою.
- ✅ Зафіксовано операційний крок для передстартової перевірки інфраструктури перед ручним прогоном ТЗ.

## Що ще треба зробити у проєкті

- 🔜 Запустити `./scripts/qa-stand-check.sh` на цільовій машині, щоб підтвердити готовність локального стенду (API + RabbitMQ + Elasticsearch).
- 🔜 Виконати ручний Go/No-Go прогін через `./scripts/go-no-go-check.sh` на цільовій машині та зафіксувати commit/tag реліз-кандидата.
- 🔜 Після підтвердження smoke — передати збірку в ручне тестування за ТЗ та зафіксувати статус `Go`.
- 🔜 Додати короткий блок у README з порядком запуску `qa-stand-check` + `go-no-go-check` для відтворюваного handoff у QA.

## Що НЕ блокує старт тестування

- Middle+ load-test у цільовому контурі.
- Demo-відео/посилання в `README.md`.

---

Цей файл є єдиним актуальним чеклістом відповідності ТЗ для поточного етапу робіт.
