# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-22.

> Документ очищено від неактуальних пунктів про REST-контролери: поточний публічний контракт бекенду — GraphQL (HotChocolate).

## 1) Що перевірено в цій ітерації

- `src/Comments.Api/Controllers`:
  - видалено REST-контролери (`CommentsController`, `CaptchaController`), щоб не підтримувати дубльований REST-контракт.
- `src/Comments.Api/GraphQL`:
  - підтверджено, що всі ключові сценарії SPA покриті через Query/Mutation (list/thread/search/preview/create/captcha/attachment text preview).
- `src/Comments.Api/Program.cs`:
  - вимкнено реєстрацію REST-стеку (`AddControllers`, Swagger, `MapControllers`).
  - залишено тільки GraphQL endpoint `/graphql` як єдину точку доступу до presentation layer API.

## 2) Актуальна матриця відповідності ТЗ

### Backend

| Вимога | Статус | Підтвердження | Наступний крок |
|---|---|---|---|
| ASP.NET Core 8 | ✅ | API конфігурується в `Program.cs` | Тримати runtime/SDK patch-релізи актуальними |
| EF Core + SQLite | ✅ | SQLite підключення + міграції на старті | Додати smoke test cold-start з порожньою БД |
| Presentation GraphQL Server (HotChocolate) | ✅ | `CommentQueries` + `CommentMutations` + error filters + `/graphql` endpoint | Додати контрактні snapshot-тести GraphQL schema/errors |
| CQRS + MediatR | ✅ | Команди/запити і `ValidationBehavior` в application layer | Додати e2e сценарії create/reply/search |
| RabbitMQ + MassTransit | ✅ | transport, consumers, retry/outbox/idempotency налаштовані | Додати CI smoke з брокером |
| Elasticsearch | ✅ | index initializer + backfill + resilient fallback | Додати CI-перевірку індексації |
| SignalR realtime | ✅ | Hub і канал подій нових коментарів | Додати reconnect/backoff e2e |

### Frontend

| Вимога | Статус | Підтвердження | Наступний крок |
|---|---|---|---|
| Angular standalone SPA | ✅ | Standalone-компоненти і маршрути root/thread | Додати e2e smoke по маршрутах |
| Пагінація (25 за замовчуванням) | ✅ | Дефолтний `pageSize=25`, є summary | Додати e2e-перевірки summary при переходах |
| Сортування root-коментарів | ✅ | Підтримка поля і напрямку сортування | Додати e2e-матрицю комбінацій sort |
| Вкладені відповіді | ✅ | Дерево коментарів з рекурсивним merge | Додати stress e2e для глибоких дерев |
| Preview + quick-tags | ✅ | Є preview-flow і toolbar тегів | Додати keyboard/accessibility кейси |
| Lightbox для зображень | ✅ | Реалізовано модальне переглядання image-вкладень | Додати e2e для close-by-click/ESC |

## 3) Вкладення і валідації

| Вимога | Статус | Підтвердження | Наступний крок |
|---|---|---|---|
| Формати PNG/JPG/GIF/TXT | ✅ | MIME-типи обмежено у backend-валідації | Додати контрактний тест на заборонений MIME |
| TXT до 100 KB | ✅ | Є перевірка ліміту для `text/plain` | Додати boundary-тести 100KB / 100KB+1 |
| Resize image до 320×240 | ✅ | Нормалізація з max width/height у storage | Додати інтеграційний тест на велике зображення |
| XSS-захист | ✅ | Серверна санітизація + frontend-валідація фрагментів | Додати security-regression suite |

## 4) Що вже зроблено в проєкті (актуально)

- Бекенд працює через GraphQL-first presentation layer (HotChocolate) без REST-контролерів.
- Реалізовано SPA-сценарії: root list, thread, reply, preview, quick-tags, realtime merge.
- Налаштовано контейнеризацію для локального запуску через `docker-compose`.
- Підготовлено docs/scripts для pre-demo і go/no-go перевірок.

## 5) Що змінено в цьому оновленні документа

1. Видалено неактуальні пункти, що описували REST як активний зовнішній контракт.
2. Зафіксовано перехід на єдиний контракт Presentation GraphQL Server (HotChocolate).
3. Оновлено пріоритети наступних кроків під GraphQL-first ітерацію.

## 6) Що ще потрібно зробити в проєкті

1. **P0 — GraphQL contract hardening**
   - Зафіксувати snapshot schema і помилки валідації/бізнес-правил.
   - Додати перевірки backward compatibility для ключових полів/операцій.
2. **P0 — E2E критичні сценарії SPA**
   - Закрити list/thread/search/preview/reply/captcha/realtime на рівні e2e.
3. **P1 — Security evidence**
   - Додати негативні сценарії XSS, валідацію вкладень та CAPTCHA abuse-перевірки.
4. **P1 — QA evidence в артефакти**
   - Прогнати `scripts/qa-stand-check.sh` і `scripts/go-no-go-check.sh` у повному стеку.
   - Зберегти результати в `docs/artifacts/`.
5. **P2 — Фінальний handoff**
   - Підготувати короткий release-checklist з посиланнями на демо-артефакти та ризики.

## 7) Примітка щодо тестів

Тести можна запускати локально для self-check, але без додавання тимчасових тестових файлів у репозиторій.
