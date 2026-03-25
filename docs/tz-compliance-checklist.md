# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-25.

> Документ очищено від проміжних/застарілих нотаток: залишено лише актуальний стан і робочий backlog.

## 1) Актуально зроблено (поточний код)

- `src/Comments.Web/src/app/shared/comment-node-card/comment-node-card.component.ts`
  - картка коментаря має адаптивний header (author/email/date) для desktop/tablet/mobile;
  - довгі email/текст не ламають layout (переноси слів, без горизонтального скролу);
  - кнопка «Відповісти» має touch-friendly tap-area і на мобільних розтягується на ширину контейнера.
- `src/Comments.Web/src/app/shared/comment-attachment/comment-attachment.component.ts`
  - прев’ю вкладень адаптивне (image/txt без переповнення по X);
  - lightbox підлаштовано під вузькі екрани (mobile/tablet), без агресивного hover-scale;
  - покращено розміри/контраст кнопки закриття для touch-пристроїв.

## 2) Матриця відповідності ТЗ (актуальна)

### Backend

| Вимога | Статус | Підтвердження | Що ще треба зробити |
|---|---|---|---|
| ASP.NET Core 8 | ✅ | API конфігурація в `Program.cs` | Підтримувати актуальні patch-оновлення runtime/SDK |
| EF Core + MySQL/SQLite | ✅ | Є `CommentsDbContext`, міграції, репозиторії | Додати smoke-тест cold-start для чистої БД |
| GraphQL (HotChocolate) | ✅ | Реалізовано Query/Mutation + error filters | Зафіксувати schema snapshots + contract checks |
| CQRS + MediatR | ✅ | Команди/запити + `ValidationBehavior` | Розширити e2e покриття create/reply/search |
| RabbitMQ + MassTransit | ✅ | Publisher/consumer + retry/idempotency | Додати CI smoke у test-stack з брокером |
| Elasticsearch + fallback | ✅ | Ініціалізація індексу, backfill, resilient search | Додати CI-перевірку деградації та індексації |
| SignalR realtime | ✅ | Hub + канал публікації нових коментарів | E2E reconnect/backoff сценарії |

### Frontend

| Вимога | Статус | Підтвердження | Що ще треба зробити |
|---|---|---|---|
| Angular standalone SPA | ✅ | Standalone-компоненти + маршрути | E2E smoke для root/thread маршрутів |
| Адаптивність mobile/tablet/desktop | ✅ | Адаптивні `comment-node-card` + `comment-attachment` | Додати e2e viewport-matrix (`320/375/768/1024/1440`) |
| Пагінація (25 за замовч.) | ✅ | `pageSize=25`, summary в UI | E2E переходи між сторінками |
| Сортування root-коментарів | ✅ | Поле + напрям сортування | E2E-матриця комбінацій sort |
| Вкладені відповіді | ✅ | Рекурсивний рендер дерева + realtime merge | Stress-тести глибоких дерев |
| Preview + quick-tags | ✅ | Toolbar + preview-flow у формах | Accessibility/keyboard сценарії |
| Lightbox зображень | ✅ | Модальний перегляд image-вкладень | E2E на ESC/backdrop close |

## 3) Що ще потрібно зробити у проєкті (пріоритет)

1. **P0 — GraphQL contract hardening**
   - Schema snapshots для стабілізації контрактів.
   - Перевірки backward compatibility для ключових запитів/мутацій.
2. **P0 — E2E критичних SPA user-flow**
   - list/thread/search/preview/reply/captcha/realtime.
3. **P1 — Accessibility + mobile UX hardening**
   - keyboard-navigation (modal, toolbar, форма);
   - viewport matrix regression (`320/375/768/1024/1440`).
4. **P1 — Security evidence**
   - негативні сценарії XSS, attachment abuse, CAPTCHA abuse.
5. **P1 — QA evidence у docs/artifacts**
   - прогони `scripts/qa-stand-check.sh` та `scripts/go-no-go-check.sh` у повному стеку;
   - збереження артефактів перевірок у репозиторії.
6. **P2 — Release handoff**
   - release-checklist (ризики, known issues, rollback notes).

## 4) Примітка по тестам

Локальні самоперевірки (build/check) виконуються для контролю якості; тимчасові тестові файли в репозиторій не додаються.
