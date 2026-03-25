# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-25.

> Актуалізовано під поточну ітерацію: прибрані застарілі проміжні записи, залишено лише фактичний стан та найближчий backlog.

## 1) Що зроблено в цій ітерації

- `src/Comments.Web/src/app/shared/comment-node-card/comment-node-card.component.ts`:
  - картка коментаря переведена на адаптивний layout метаданих (desktop/tablet/mobile);
  - збільшено tap-area кнопки «Відповісти» для touch-пристроїв;
  - додано мобільний режим кнопки на всю ширину;
  - вкладення (image/text) підлаштовуються без горизонтального переповнення.
- `src/Comments.Web/src/app/shared/comment-tree/comment-tree.component.ts`:
  - відступи дерева зроблено гнучкими через `clamp(...)`;
  - на мобільних додатково зменшено вкладеність для читабельності.
- `src/Comments.Web/src/app/pages/root-list/root-list-page.component.ts`:
  - блок фільтрів/сортування і пагінації переходить у вертикальний режим на `<=768px`;
  - кнопка пошуку адаптована для мобільного UX.

## 2) Актуальна матриця відповідності ТЗ

### Backend

| Вимога | Статус | Підтвердження | Що ще треба зробити |
|---|---|---|---|
| ASP.NET Core 8 | ✅ | API стартує через `Program.cs` | Підтримувати актуальні patch-версії runtime/SDK |
| EF Core + SQLite/MySQL | ✅ | Є `CommentsDbContext`, міграції та конфігурація провайдера | Додати cold-start smoke test для чистої БД |
| GraphQL (HotChocolate) | ✅ | Реалізовані Query/Mutation + error filters | Додати snapshot/contract тести схеми |
| CQRS + MediatR | ✅ | Команди/запити + `ValidationBehavior` | Розширити e2e-покриття create/reply/search |
| RabbitMQ + MassTransit | ✅ | Паблішер/консьюмери + retry/idempotency | CI smoke з брокером у test stack |
| Elasticsearch + fallback | ✅ | Ініціалізація індексу, backfill, resilient search | CI-перевірка індексації і деградації |
| SignalR realtime | ✅ | Hub + канал розсилки нових коментарів | E2E на reconnect/backoff сценарії |

### Frontend

| Вимога | Статус | Підтвердження | Що ще треба зробити |
|---|---|---|---|
| Angular standalone SPA | ✅ | Standalone-компоненти + маршрути root/thread | Додати e2e smoke по маршрутах |
| Адаптивність (mobile/tablet/desktop) | ✅ | Адаптивні картки + дерево + контроли списку | Додати screenshot regression/e2e viewport matrix |
| Пагінація (25 за замовчуванням) | ✅ | `pageSize=25`, summary лічильники | E2E-перевірка переходів між сторінками |
| Сортування root-коментарів | ✅ | Поле + напрямок сортування у UI/API | E2E-матриця комбінацій sort |
| Вкладені відповіді | ✅ | Рекурсивний рендер дерева + merge realtime | Stress-сценарії для глибоких дерев |
| Preview + quick-tags | ✅ | Toolbar + preview-flow у формах | Keyboard/A11y покриття |
| Lightbox зображень | ✅ | Модальний перегляд вкладених image-файлів | E2E для ESC/backdrop close |

## 3) Вкладення, валідації, безпека

| Вимога | Статус | Підтвердження | Що ще треба зробити |
|---|---|---|---|
| PNG/JPG/GIF/TXT | ✅ | Валідація MIME-типів на backend | Негативний контрактний тест на заборонені MIME |
| TXT до 100 KB | ✅ | Є перевірка ліміту для `text/plain` | Boundary-тести `100KB` / `100KB+1` |
| Resize image до 320×240 | ✅ | Нормалізація розміру перед збереженням | Інтеграційний тест на великі зображення |
| XSS-захист | ✅ | Санітизація контенту + frontend-обмеження XHTML | Security-regression набір для payload-сценаріїв |

## 4) Що ще треба робити в проєкті (пріоритети)

1. **P0 — GraphQL contract hardening**
   - Зафіксувати snapshots схеми та error-моделі.
   - Додати backward compatibility checks для ключових операцій.
2. **P0 — E2E критичних user-flow SPA**
   - Покрити list/thread/search/preview/reply/captcha/realtime.
3. **P1 — Accessibility і мобільний UX**
   - Перевірити keyboard-navigation для модалок/toolbar.
   - Додати viewport e2e matrix (`320/375/768/1024/1440`).
4. **P1 — Security evidence**
   - Негативні сценарії XSS, attachment abuse, CAPTCHA abuse.
5. **P1 — QA-артефакти**
   - Прогнати `scripts/qa-stand-check.sh` і `scripts/go-no-go-check.sh` у повному стеку.
   - Зберегти звіти в `docs/artifacts/`.
6. **P2 — Release handoff**
   - Підготувати release-checklist із ризиками, known issues, rollback notes.

## 5) Примітка щодо тестів

Тести запускаються локально для self-check. Тимчасові тестові файли та чернетки у репозиторій не додаються.
