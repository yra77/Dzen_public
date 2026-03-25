# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-25.

> Документ очищено від неактуальних пунктів. Поточний контракт: **GraphQL-only** (без Swagger/REST API), без load-testing сценаріїв k6 у складі проєкту.

## 1) Внесені зміни в документацію (цього оновлення)

- Оновлено `README.md` під фактичний стан проєкту.
- Видалено згадки про Swagger, REST API та k6 load testing як про активні/наявні частини поточного scope.
- Синхронізовано backlog із фактичним напрямом: GraphQL + SPA + realtime + QA evidence.

## 2) Актуально зроблено (поточний код)

### Backend

- **.NET 8 API host** для SPA та інфраструктури застосунку.
- **GraphQL endpoint** (`/graphql`) як єдиний API-контракт.
- **SignalR hub** (`/hubs/comments`) для realtime-оновлень.
- **EF Core + SQLite** з автозастосуванням міграцій.
- Підготовлені інфраструктурні модулі для search/messaging/captcha/storage.

### Frontend

- **Angular standalone SPA** зі структурою коментарів і формами створення/відповіді.
- Адаптивні UI-компоненти для картки коментаря та вкладень.
- Підтримка preview вкладень і mobile/tablet/desktop UX-поведінки.

## 3) Матриця відповідності ТЗ (актуальна)

| Напрям | Статус | Підтвердження | Що ще треба зробити |
|---|---|---|---|
| ASP.NET Core 8 | ✅ | `Comments.Api` запускається як основний host | Тримати runtime/SDK patch-level актуальним |
| GraphQL (HotChocolate) | ✅ | Endpoint `/graphql`, query/mutation, error filters | Додати schema snapshots + compatibility checks |
| CQRS + MediatR + Validation | ✅ | Команди/запити, pipeline validation | Розширити e2e покриття критичних сценаріїв |
| EF Core + SQLite | ✅ | DbContext, migration flow, repository layer | Додати cold-start smoke для чистої БД |
| SignalR realtime | ✅ | Hub + канали оновлень | E2E reconnect/backoff перевірки |
| Angular SPA (standalone) | ✅ | SPA-структура та UI-компоненти | E2E smoke root/thread/reply/search |
| Адаптивність UI | ✅ | Актуальні mobile/tablet/desktop правки | Viewport matrix regression (`320/375/768/1024/1440`) |

## 4) Що ще треба робити у проєкті (пріоритет)

1. **P0 — GraphQL contract hardening**
   - зафіксувати schema snapshots;
   - додати перевірки backward compatibility для ключових операцій.

2. **P0 — E2E критичних user-flow SPA**
   - list/thread/reply/search/preview/captcha/realtime;
   - стабілізувати сценарії для QA handoff.

3. **P1 — Accessibility + mobile UX hardening**
   - keyboard-navigation для форм/модалок/toolbar;
   - viewport matrix regression.

4. **P1 — Security evidence**
   - негативні сценарії XSS/attachment abuse/captcha abuse;
   - фіксація результатів у артефактах.

5. **P1 — QA evidence у `docs/artifacts`**
   - регулярні прогони `qa-stand-check` та `go-no-go-check`;
   - збереження JSON-звітів як доказів готовності.

6. **P2 — Release handoff пакет**
   - release-checklist, known issues, rollback notes;
   - узгоджений пакет артефактів для приймання.

## 5) Примітка по тестам

Локальні самоперевірки (build/check) дозволені для контролю якості, але тимчасові тестові файли в репозиторій не додаються.
