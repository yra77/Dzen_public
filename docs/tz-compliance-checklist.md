# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-25.

> Документ оновлено: прибрано застарілі проміжні примітки, залишено тільки актуальний стан і найближчі задачі.

## 1) Що перевірено в поточній ітерації

- `src/Comments.Web/src/styles.css`:
  - посилено адаптивність для `768px` і `480px` (контейнер, панелі, кнопки, таблиця, вкладені гілки, прев’ю зображень);
  - додано мобільний «compact» режим для вузьких телефонів.
- `src/Comments.Web/src/app/pages/root-list/root-list-page.component.ts`:
  - елементи фільтрів/сортування і пагінації тепер коректно переходять у вертикальний layout на мобільних.
- `src/Comments.Web/src/app/pages/thread/thread-page.component.ts`:
  - зменшено відступи дерева гілки на малих екранах.

## 2) Актуальна матриця відповідності ТЗ

### Backend

| Вимога | Статус | Підтвердження | Наступний крок |
|---|---|---|---|
| ASP.NET Core 8 | ✅ | API конфігурується в `Program.cs` | Тримати runtime/SDK patch-релізи актуальними |
| EF Core + SQLite | ✅ | SQLite підключення + міграції на старті | Додати smoke test cold-start з порожньою БД |
| GraphQL (HotChocolate) | ✅ | `CommentQueries` + `CommentMutations` + error filters + `/graphql` | Додати snapshot-тести GraphQL schema/errors |
| CQRS + MediatR | ✅ | Команди/запити + `ValidationBehavior` | Додати e2e сценарії create/reply/search |
| RabbitMQ + MassTransit | ✅ | transport, consumers, retry/outbox/idempotency | Додати CI smoke з брокером |
| Elasticsearch | ✅ | index initializer + backfill + resilient fallback | Додати CI-перевірку індексації |
| SignalR realtime | ✅ | Hub і канал подій нових коментарів | Додати reconnect/backoff e2e |

### Frontend

| Вимога | Статус | Підтвердження | Наступний крок |
|---|---|---|---|
| Angular standalone SPA | ✅ | Standalone-компоненти і маршрути root/thread | Додати e2e smoke по маршрутах |
| Адаптивність для різних пристроїв | ✅ | Додані брейкпоінти `900/768/640/480`, адаптивна пагінація та контроли | Додати візуальні e2e/screenshot regression |
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

- GraphQL-first backend для сценаріїв list/thread/search/preview/create/captcha/attachment.
- Standalone SPA для списку, гілки, відповіді, preview і realtime оновлень.
- Додано адаптивні стилі для мобільних і планшетних екранів у ключових сторінках.

## 5) Що ще потрібно зробити в проєкті

1. **P0 — GraphQL contract hardening**
   - Зафіксувати snapshot schema і помилки валідації/бізнес-правил.
   - Додати перевірки backward compatibility для ключових полів/операцій.
2. **P0 — E2E критичні сценарії SPA**
   - Закрити list/thread/search/preview/reply/captcha/realtime на рівні e2e.
3. **P1 — Accessibility + UX hardening**
   - Додати keyboard-coverage для модалок/toolbar.
   - Перевірити читабельність і контраст на мобільних.
4. **P1 — Security evidence**
   - Додати негативні сценарії XSS, валідацію вкладень та CAPTCHA abuse-перевірки.
5. **P1 — QA evidence в артефакти**
   - Прогнати `scripts/qa-stand-check.sh` і `scripts/go-no-go-check.sh` у повному стеку.
   - Зберегти результати в `docs/artifacts/`.
6. **P2 — Фінальний handoff**
   - Підготувати release-checklist з посиланнями на демо-артефакти та ризики.

## 6) Примітка щодо тестів

Тести запускаються локально для self-check, без додавання тимчасових тестових файлів у репозиторій.
