# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-18 (після виправлення старту API при недоступному MySQL).

## Актуальний стан по ТЗ

1. ✅ **Персистентність коментарів у MySQL (`comments`)**
   - Backend за замовчуванням працює з `Persistence:Provider=MySql`.
   - Підключення задається через `ConnectionStrings:CommentsDb`.
   - Дані автора й коментаря зберігаються через EF Core + Pomelo у реляційній БД.

2. ✅ **Базова безпека введення**
   - Валідація і санітизація коментарів активні.
   - Немає ручного SQL-конкатенування для роботи з коментарями.

3. ✅ **Коментарі до нових змін у коді**
   - Для нових класів/методів, доданих у цій ітерації, внесені пояснювальні XML/inline-коментарі.

4. ✅ **Діагностика та стійкість startup-процесу**
   - Збережено retry-стратегію EF Core для MySQL.
   - Додано preflight-очікування TCP-доступності MySQL endpoint перед `Database.MigrateAsync()`.
   - Помилки старту логуються з безпечним target (`Server/Port/Database/User`, без пароля).

## Що змінено в цій ітерації (2026-03-18)

- ✅ Реалізовано `MySqlStartupOptions` для керування preflight-поведінкою (`Enabled`, `MaxWaitSeconds`, `RetryDelaySeconds`, `ConnectTimeoutSeconds`).
- ✅ У стартовому конвеєрі API додано `WaitForMySqlAvailabilityAsync(...)`, який виконує кілька TCP-спроб до MySQL перед запуском міграцій.
- ✅ Додано конфіг `MySqlStartup` у `appsettings.json`.
- ✅ Додано env-перевизначення `MySqlStartup__*` у `docker-compose.yml` для контейнерного сценарію.
- ✅ Очищено цей чекліст від неактуальних/виконаних пунктів, що більше не є TODO.

## Чому виникала помилка `Unable to connect to any of the specified MySQL hosts`

- Якщо API стартує раніше, ніж MySQL приймає TCP-з’єднання, `Database.MigrateAsync()` падає після вичерпання retry policy EF (`RetryLimitExceededException`).
- У локальному запуску поза Docker помилка також виникає, якщо в `ConnectionStrings:CommentsDb` лишився `Server=localhost`, але MySQL фактично не запущений або слухає інший host/port.

## Що ще потрібно зробити далі (актуальний backlog)

- 🔜 Прогнати повний E2E запуск `docker-compose` (API + MySQL + RabbitMQ + Elasticsearch) і зафіксувати результати в README/чеклісті.
- 🔜 Додати `healthcheck` для `mysql` та перевести `depends_on` на умову `service_healthy` (щоб orchestration також очікував готовність БД).
- 🔜 Описати в README runbook для типових startup-проблем:
  - перевірка host/port;
  - перевірка креденшалів;
  - перевірка, що container MySQL у статусі healthy;
  - повторний старт API.
- 🔜 Синхронізувати prod/stage конфіги та секрети під MySQL (connection string + policy обробки startup timeout).
- 🔜 Доробити smoke-check у CI: перевірка `/health` після підняття стеку.

---

Файл підтримується як робочий чекліст відповідності ТЗ і актуальний на 2026-03-18.
