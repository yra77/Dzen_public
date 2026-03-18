# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-18 (оновлено після виправлення Docker build для різних CPU-архітектур).

## Актуальний стан по ТЗ

1. ✅ **Персистентність коментарів у MySQL (`comments`)**
   - Backend за замовчуванням працює з `Persistence:Provider=MySql`.
   - Підключення задається через `ConnectionStrings:CommentsDb`.
   - Дані автора й коментаря зберігаються через EF Core + Pomelo у реляційній БД.

2. ✅ **Базова безпека введення**
   - Валідація і санітизація коментарів активні.
   - Немає ручного SQL-конкатенування для операцій з коментарями.

3. ✅ **Стійкість startup-процесу**
   - Діє preflight-очікування TCP-доступності MySQL endpoint перед `Database.MigrateAsync()`.
   - Логи старту містять діагностику підключення без витоку паролів.
   - У `docker-compose` для MySQL налаштований healthcheck, а API чекає `service_healthy`.

4. ✅ **Сумісність Docker build з різними архітектурами**
   - Прибрано жорстке платформне обмеження зі stage `build` у `src/Comments.Api/Dockerfile`, щоб уникнути `exec /bin/sh: exec format error` на хостах без емуляції.
   - `dotnet publish` тепер передає `-a` лише якщо задано `TARGETARCH`, що коректно працює і для buildx, і для звичайного `docker compose build`.

## Що змінено в цій ітерації (2026-03-18)

- ✅ Виправлено причину помилки збірки:
  - `exec /bin/sh: exec format error` на кроці `dotnet restore`.
- ✅ Оновлено `src/Comments.Api/Dockerfile`:
  - видалено привʼязку build-stage до конкретної платформи;
  - додано умовну передачу `TARGETARCH` у publish-команду.
- ✅ Очищено чекліст від неактуальних формулювань; залишено лише актуальний стан і фактичний backlog.

## Що ще потрібно зробити у проєкті (актуальний backlog)

- 🔜 Додати в README окремий розділ **Troubleshooting Docker/Architecture**:
  - як запускати стек на Apple Silicon/ARM;
  - коли й навіщо задавати `DOCKER_DEFAULT_PLATFORM`;
  - як діагностувати `exec format error`.
- 🔜 Прогнати E2E перевірку `docker compose up --build` на двох середовищах (amd64 та arm64) і зафіксувати результати.
- 🔜 Додати CI smoke-check: підняття стеку й перевірка `GET /health`.
- 🔜 Додати короткий операційний runbook для startup-помилок MySQL (host/port/credentials/healthy-state).

---

Файл підтримується як робочий чекліст відповідності ТЗ і актуальний на 2026-03-18.
