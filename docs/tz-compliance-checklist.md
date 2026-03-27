# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-27.

> Документ залишено тільки з актуальними пунктами. Поточний контракт: **GraphQL-only** (без Swagger/REST API).

## 1) Що оновлено зараз

- Конфігурацію URL винесено у два файли, які можна змінювати без правок коду:
  - `src/Comments.Web/src/environments/environment.ts` — `apiBaseUrl` для Angular SPA.
  - `src/Comments.Api/appsettings.json` — `Networking:ApiListenUrls` і `Cors:AllowedOrigins` для API host/CORS.
- Видалено застарілі згадки про неактуальні елементи процесу.

## 2) Актуальний стан по ТЗ

| Напрям | Статус | Підтвердження | Що ще треба зробити |
|---|---|---|---|
| ASP.NET Core 8 | ✅ | `Comments.Api` працює як host API + SPA | Періодично оновлювати patch-версії runtime/SDK |
| GraphQL endpoint | ✅ | `/graphql` використовується як основний контракт | Додати compatibility-check для ключових операцій |
| SignalR realtime | ✅ | `/hubs/comments` для live-оновлень | Додати reconnect/backoff e2e-перевірки |
| Angular SPA | ✅ | Standalone SPA з формами/тредами/вкладеннями | Закрити e2e smoke для root/thread/reply/search |
| Керування URL через конфіг | ✅ | Адреси API/CORS змінюються у `environment.ts` + `appsettings.json` | За потреби додати окремі профілі для dev/stage/prod |

## 3) Що ще робити у проєкті (пріоритет)

1. **P0 — GraphQL contract hardening**
   - schema snapshot-и;
   - перевірка backward compatibility.

2. **P0 — E2E критичних user-flow**
   - list/thread/reply/search/preview/captcha/realtime;
   - стабілізувати сценарії для QA handoff.

3. **P1 — Accessibility + mobile UX hardening**
   - keyboard navigation для форм/модалок;
   - viewport regression (`320/375/768/1024/1440`).

4. **P1 — Security evidence**
   - негативні сценарії XSS/attachment abuse/captcha abuse;
   - фіксація результатів у `docs/artifacts`.

## 4) Нотатка по тестах

Локальні самоперевірки (build/check) можна виконувати для контролю якості, але тимчасові тестові файли не додаються у репозиторій.
