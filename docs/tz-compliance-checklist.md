# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-22.

> Документ оновлено за фактичним станом репозиторію: прибрано неактуальні формулювання, додано перелік внесених змін і окремий блок по коментарях у коді.

## 1) Що перевірено в цій ітерації

- `docker-compose.yml`:
  - `comments-api` збирається з `src/Comments.Api/Dockerfile`.
  - API публікується на порту `5000`; у стеку підключені RabbitMQ та Elasticsearch.
  - SQLite зберігається у volume `comments_data` (`/app/data/comments.db`).
- `src/Comments.Api/Dockerfile`:
  - multi-stage build (`sdk:8.0` → `aspnet:8.0`).
  - використовується `TARGETARCH` для multi-arch публікації.
  - publish виконується з `/p:UseAppHost=false`, runtime запускає `Comments.Api.dll`.
- `src/**` (C#):
  - виконано повторний системний прохід по XML-коментарях на публічних методах і конструкторах.
  - додано/уніфіковано файлові заголовки у критичних файлах API/Application/Infrastructure.

## 2) Актуальна матриця відповідності ТЗ

### Backend

| Вимога | Статус | Підтвердження | Наступний крок |
|---|---|---|---|
| ASP.NET Core 8 | ✅ | API конфігурується через `Program.cs` + DI | Тримати runtime/SDK patch-релізи актуальними |
| EF Core + SQLite | ✅ | Використовується SQLite підключення і міграції | Додати smoke test cold-start з порожньою БД |
| GraphQL (HotChocolate) | ✅ | Є Query/Mutation і фільтри помилок | Додати snapshot test на формат GraphQL помилок |
| CQRS + MediatR | ✅ | Команди/запити і `ValidationBehavior` в application layer | Додати e2e сценарії create/reply/search |
| RabbitMQ + MassTransit | ✅ | Налаштовано transport, consumers, retry/outbox/idempotency | Додати CI smoke з брокером |
| Elasticsearch | ✅ | Ініціалізація індексу, backfill, resilient fallback | Додати CI-перевірку індексації |
| SignalR realtime | ✅ | Hub і канал розсилки подій нових коментарів | Додати reconnect/backoff e2e |

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

- Зібрано backend-контур: REST + GraphQL + CQRS + EF Core + RabbitMQ + Elasticsearch + SignalR.
- Реалізовано SPA-контур: root list, thread, reply, preview, quick-tags, realtime merge.
- Налаштовано контейнеризацію для локального запуску через `docker-compose`.
- Підготовлено docs/scripts для pre-demo і go/no-go перевірок.

## 5) Що змінено в цьому оновленні документа

1. Прибрано неактуальні або надто загальні формулювання без прив’язки до файлів/компонентів.
2. Уніфіковано термінологію «наступних кроків» під формат delivery (smoke/e2e/security evidence).
3. Оновлено блок контролю коментарів у коді (класи/методи/файли) за результатами фактичних правок.
4. Додано конкретний перелік файлів, де в цій ітерації додано XML-коментарі та файлові заголовки.

## 6) Коментарі в коді: стан і що ще треба зробити

### Вже зроблено

- Проведено повторну перевірку C#-коду в `src/**` на предмет документування типів/методів.
- Додано XML-коментарі для відсутніх публічних елементів у файлах:
  - `src/Comments.Infrastructure/Captcha/RecaptchaCaptchaValidator.cs`
  - `src/Comments.Infrastructure/Persistence/InMemoryCommentRepository.cs`
  - `src/Comments.Application/Features/Comments/Queries/GetCommentsPage/GetCommentsPageQueryValidator.cs`
  - `src/Comments.Application/Features/Comments/Queries/GetCommentsPage/GetCommentsPageQueryHandler.cs`
- Додано файлові заголовки (file overview) у:
  - `src/Comments.Api/Controllers/CommentsController.cs`
  - `src/Comments.Api/Controllers/CaptchaController.cs`
  - а також у файли, де додавались XML-коментарі вище.

### Що ще потрібно зробити обов’язково

1. **P0 — Завершити покриття коментарями TypeScript-частини**
   - Додати JSDoc-коментарі до публічних класів/методів у `src/Comments.Web/src/app/**`.
   - Для сервісів та фасадів узгодити формат `@param` / `@returns`.
2. **P0 — Доробити файлові заголовки у решті C#-файлів без контексту**
   - Пріоритет: `Infrastructure/Messaging`, `Infrastructure/Search`, `Application/Features/**`.
3. **P1 — Увімкнути контроль у CI**
   - Підключити перевірку попереджень документації (`CS1591`) як quality gate (мінімум для `public` API).
4. **P1 — Узгодити стиль коментарів**
   - Зафіксувати шаблон коментарів у `docs/` (однаковий стиль для сервісів, DTO, handler’ів, validator’ів).

## 7) Що ще потрібно зробити в проєкті (після цього оновлення)

1. **P0 — Формальні артефакти якості**
   - Прогнати `scripts/qa-stand-check.sh` і `scripts/go-no-go-check.sh` у середовищі з повним стеком.
   - Зберегти результати в `docs/artifacts/`.
2. **P1 — E2E покриття**
   - Закрити критичні UX-сценарії (list/thread/search/preview/lightbox/realtime reconnect).
3. **P1 — Security evidence**
   - Додати негативні сценарії XSS і перевірки валідації вкладень у тестовий набір.
4. **P2 — Фінальний handoff**
   - Додати демо-прохід і короткий release-checklist з посиланнями на артефакти.

## 8) Примітка щодо тестів

Тести можна запускати локально для перевірки, але без додавання тимчасових тестових файлів у репозиторій.
