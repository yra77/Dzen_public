# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-27.

> Документ містить лише актуальні пункти для поточного стану проєкту (GraphQL-only контракт).

## 1) Актуальний стан по ТЗ

| Напрям | Статус | Підтвердження | Що ще треба зробити |
|---|---|---|---|
| ASP.NET Core 8 | ✅ | `Comments.Api` працює як host API + SPA | Періодично оновлювати patch-версії runtime/SDK |
| GraphQL endpoint | ✅ | `/graphql` — основний API-контракт | Додати compatibility-check для ключових операцій |
| SignalR realtime | ✅ | `/hubs/comments` для live-оновлень | Додати reconnect/backoff e2e-перевірки |
| Angular SPA | ✅ | Standalone SPA з формами, тредами, вкладеннями | Закрити e2e smoke для root/thread/reply/search |
| Конфігуровані URL | ✅ | API/CORS керуються через `environment.ts` + `appsettings.json` | За потреби додати окремі профілі dev/stage/prod |

## 2) Що ще робити у проєкті (пріоритет)

1. **P0 — GraphQL contract hardening**
   - schema snapshot-и;
   - backward compatibility checks.

2. **P0 — E2E критичних user-flow**
   - list/thread/reply/search/preview/captcha/realtime;
   - стабілізувати сценарії для QA handoff.

3. **P1 — Accessibility + mobile UX hardening**
   - keyboard navigation для форм/модалок;
   - viewport regression (`320/375/768/1024/1440`).

4. **P1 — Security evidence**
   - негативні сценарії XSS/attachment abuse/captcha abuse;
   - фіксація результатів у `docs/artifacts`.

## 3) Нотатка по тестах

Локальні самоперевірки (build/check) можна виконувати для контролю якості, але тимчасові тестові файли не додаються у репозиторій.
