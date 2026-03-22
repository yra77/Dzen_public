# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-22.

> Документ очищено від застарілих пунктів і синхронізовано з поточним станом репозиторію.

## 1) Що перевірено в цій ітерації

- `docker-compose.yml`:
  - `comments-api` збирається з `src/Comments.Api/Dockerfile`.
  - API запущено на порту `5000`, з увімкненими RabbitMQ та Elasticsearch.
  - SQLite файл БД зберігається в volume `comments_data` (`/app/data/comments.db`).
- `src/Comments.Api/Dockerfile`:
  - multi-stage build (`sdk:8.0` → `aspnet:8.0`).
  - є підтримка `TARGETARCH` для multi-arch публікації.
  - publish виконується з `/p:UseAppHost=false`, runtime-контейнер запускає `Comments.Api.dll`.

## 2) Актуальна матриця відповідності ТЗ

### Backend

| Вимога | Статус | Підтвердження | Наступний крок |
|---|---|---|---|
| ASP.NET Core 8 | ✅ | API конфігурується через `Program.cs` + DI | Тримати runtime/SDK patch-релізи актуальними |
| EF Core + SQLite | ✅ | Використовується SQLite підключення і міграції | Додати smoke тест cold-start з пустою БД |
| GraphQL (HotChocolate) | ✅ | Є Query/Mutation і фільтри помилок | Додати snapshot тест на формат GraphQL помилок |
| CQRS + MediatR | ✅ | Команди/запити і `ValidationBehavior` в application layer | Додати e2e сценарії create/reply/search |
| RabbitMQ + MassTransit | ✅ | Налаштовано transport, consumers, retry/outbox/idempotency | Додати CI smoke з брокером |
| Elasticsearch | ✅ | Ініціалізація індексу, backfill, resilient fallback | Додати CI перевірку індексації |
| SignalR realtime | ✅ | Hub і канал розсилки подій нових коментарів | Додати reconnect/backoff e2e |

### Frontend

| Вимога | Статус | Підтвердження | Наступний крок |
|---|---|---|---|
| Angular standalone SPA | ✅ | Standalone компоненти і маршрути root/thread | Додати e2e smoke по маршрутах |
| Пагінація (25 за замовчуванням) | ✅ | Дефолтний `pageSize=25`, є відображення summary | Додати e2e перевірки summary при переходах |
| Сортування root-коментарів | ✅ | Підтримка поля і напрямку сортування | Додати e2e матрицю комбінацій sort |
| Вкладені відповіді | ✅ | Дерево коментарів з рекурсивним merge | Додати stress e2e для глибоких дерев |
| Preview + quick-tags | ✅ | Є preview-flow і toolbar тегів | Додати keyboard/accessibility кейси |
| Lightbox для зображень | ✅ | Реалізовано модальне переглядання image-вкладень | Додати e2e для close-by-click/ESC |

## 3) Вкладення і валідації

| Вимога | Статус | Підтвердження | Наступний крок |
|---|---|---|---|
| Формати PNG/JPG/GIF/TXT | ✅ | MIME-типи обмежено у backend-валідації | Додати контрактний тест на заборонений MIME |
| TXT до 100 KB | ✅ | Є перевірка ліміту для `text/plain` | Додати boundary тести 100KB / 100KB+1 |
| Resize image до 320×240 | ✅ | Нормалізація з max width/height у storage | Додати інтеграційний тест на велике зображення |
| XSS-захист | ✅ | Серверна санітизація + frontend валідація фрагментів | Додати security-regression suite |

## 4) Що вже зроблено в проєкті (актуально)

- Зібрано backend-контур: REST + GraphQL + CQRS + EF Core + RabbitMQ + Elasticsearch + SignalR.
- Реалізовано SPA-контур: root list, thread, reply, preview, quick-tags, realtime merge.
- Налаштовано контейнеризацію для локального запуску через `docker-compose`.
- Підготовлено docs/scripts для pre-demo і go/no-go перевірок.

## 5) Що ще потрібно зробити

1. **P0 — Формальні артефакти якості**:
   - Прогнати `scripts/qa-stand-check.sh` і `scripts/go-no-go-check.sh` у середовищі з повним стеком.
   - Зберегти результати у `docs/artifacts/`.
2. **P1 — E2E покриття**:
   - Закрити критичні UX сценарії (list/thread/search/preview/lightbox/realtime reconnect).
3. **P1 — Security evidence**:
   - Додати негативні сценарії XSS і перевірки валідації вкладень у тестовий набір.
4. **P2 — Фінальний handoff**:
   - Додати демо-прохід і короткий release-checklist з посиланнями на артефакти.

## 6) Примітка щодо тестів

Тести запускати можна локально для перевірки, але додавати тестові файли у репозиторій зараз не потрібно (відповідно до поточної вказівки).
