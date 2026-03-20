# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-20 (ітерація frontend-rxjs-state: уніфіковано retry-policy для list/thread/search завантаження).

> Документ містить лише актуальний стан реалізації, поточний план і наступні кроки без історичних застарілих нотаток.

## 1) Матриця відповідності ТЗ (актуально)

### Backend

| Вимога ТЗ | Статус | Поточний стан у репозиторії | Що робимо далі |
|---|---|---|---|
| ASP.NET Core 8.0 (LTS) | ✅ Виконано | `Comments.Api`, `Comments.Application`, `Comments.Domain`, `Comments.Infrastructure` таргетують `net8.0`. | Підтримувати patch-оновлення .NET 8. |
| Entity Framework Core + SQLite | ✅ Виконано | У `Program.cs` активний `UseSqlite(...)` за `Persistence:Provider=Sqlite`, міграції застосовуються через `Database.MigrateAsync()`. | Підтримувати консистентність SQLite-міграцій під зміни моделі. |
| GraphQL (HotChocolate) | ✅ Виконано | Піднято endpoint `/graphql`, працюють `CommentQueries` і `CommentMutations`. | Додати контрактні перевірки GraphQL-схеми/операцій у CI. |
| CQRS + MediatR | ✅ Виконано | Команди/запити винесені в `Comments.Application`, у pipeline підключено `ValidationBehavior`. | Додати e2e перевірки CQRS-сценаріїв. |
| RabbitMQ (MassTransit) | ⚠️ Частково | В роботі використовується `RabbitMQ.Client` (publisher + consumer hosted service), MassTransit поки не інтегрований. | Міграція на MassTransit: retry, DLQ, outbox, idempotency. |
| Elasticsearch (офіційний .NET client) | ⚠️ Частково | Пошук/індексація реалізовані через `HttpClient`-адаптери; `Elasticsearch.Enabled` керує вмиканням. | Перейти на офіційний .NET client Elasticsearch + typed mapping/templates. |
| SignalR | ✅ Виконано | Працює `CommentsHub` і endpoint `/hubs/comments`, подія створення коментаря розсилається realtime-каналом. | Додати регрес-перевірки reconnect/backoff сценаріїв. |
| Clean Architecture + SOLID | ✅ Базово виконано | Розділено шари Domain/Application/Infrastructure/Api, інфраструктурні реалізації інтерфейсів винесені в Infrastructure. | Додати automated architecture-guard перевірки залежностей між шарами. |

### Frontend

| Вимога ТЗ | Статус | Поточний стан у репозиторії | Що робимо далі |
|---|---|---|---|
| Angular (standalone components) | ✅ Виконується за планом | `Comments.Web` працює на standalone-компонентах; дерево винесено в `CommentTreeComponent`, вкладення перегляду — у `CommentAttachmentComponent`, submit-помилки форм — у `FormSubmitFeedbackComponent`, блоки attachment/CAPTCHA — у `CommentAttachmentPickerComponent` і `CaptchaInputComponent`, поля автора+тексту+quick-tags+preview — у `CommentAuthorTextFieldsComponent`, header/actions модалок — у `CommentModalHeaderComponent` та `CommentFormActionsComponent`, layout модалки (`backdrop/panel`) — у `CommentModalLayoutComponent` з уніфікованими `test-id`, `closeMode`/`closeRequested` і причинами закриття (`backdrop` / `escape` / `close-button`). Для обох сторінок (`RootListPageComponent` і `ThreadPageComponent`) застосовано shared `CommentFormStateFacade`, `CommentFormAttachmentState`, shared `CommentQueryStateStream` і orchestration helpers (`refreshCommentPreview`, `reloadCommentCaptcha`, `runCommentSubmitWorkflow`) для submit/preview/captcha/modal/attachment/load станів; для root-list додано search UI + search/list unified state через той самий stream, debounce для input-пошуку та URL-sync (`page/sort/query`) для reload/back-forward; realtime channel використовує локальний merge payload у list/thread, а у search-mode переходить на безпечний reload. | Наступний крок: покрити search flow e2e-тестами (debounce + URL-state + paging/sort). |
| Apollo Client (GraphQL) | ✅ Виконано | Apollo Angular інтегровано; запити/мутації працюють через GraphQL API. | Нормалізувати cache-policy та обробку мережевих/GraphQL помилок. |
| RxJS | ✅ Виконано | RxJS використовується в сервісах та UI-компонентах; `CommentQueryStateStream` покриває list/thread/search/realtime-load сценарії, root-search має debounced input-stream через `Subject + debounceTime + distinctUntilChanged`, а для тимчасових network/server помилок додано обмежений auto-retry з backoff. | Додати e2e перевірки debounce-логіки, URL-sync та auto-retry UX для search/list/thread запитів. |
| Якість збірки (Angular compiler warnings) | ⚠️ Частково | Додано скрипт `scripts/check-angular-build.sh`: production build падає при наявності `WARNING` у логах. Скрипт інтегровано в `scripts/go-no-go-check.sh` як окремий quality gate. | Додати окремий CI job, який запускає цей gate на кожному PR. |

## 2) Пріоритетний план робіт

1. **P0 — Messaging:** перевести RabbitMQ інтеграцію з `RabbitMQ.Client` на MassTransit (producer/consumer + retry + DLQ + outbox/idempotency).
2. **P1 — Search:** замінити `HttpClient`-реалізацію Elasticsearch на офіційний .NET client із typed mapping/templates.
3. **P1 — Frontend/RxJS state UX:** завершити e2e покриття для search/list/thread flow (debounce + URL-sync + paging/sort + auto-retry сценарії).
4. **P1 — GraphQL quality:** додати контрактні перевірки GraphQL-запитів/мутацій (включно з негативними кейсами) у CI.
5. **P2 — Architecture quality:** додати автоматичні перевірки дозволених напрямків залежностей між шарами.
6. **P2 — Build quality gates:** винести `scripts/check-angular-build.sh` в CI та зробити build warning/error блокуючим критерієм.

## 3) Що внесено в цій ітерації

- Додано єдиний конфіг `COMMENT_QUERY_RETRY_POLICY` у фронтенді для list/thread/search завантажень (`autoRetryCount=2`, `autoRetryBaseDelayMs=600`).
- `RootListPageComponent` переведено на shared retry-policy без дублювання inline-конфігурації.
- `ThreadPageComponent` переведено на той самий shared retry-policy без дублювання inline-конфігурації.
- Із checklist видалено неактуальні історичні формулювання; залишено лише поточний стан і релевантні next steps.

## 4) Що ще треба зробити у проєкті

- **P0 Messaging:** перейти з поточного `RabbitMQ.Client` на MassTransit (retry, DLQ, outbox, idempotency).
- **P1 Search:** замінити low-level HTTP інтеграцію Elasticsearch на офіційний .NET client із typed mapping/templates.
- **P1 Frontend/RxJS UX:** додати e2e перевірки debounce + URL-sync + auto-retry для search/list/thread, щоб закріпити поведінку в CI.
- **P1 GraphQL quality:** додати контрактні перевірки GraphQL-операцій (позитивні + негативні кейси) у CI.
- **P2 Architecture quality:** додати перевірки напрямків залежностей між шарами як автоматичний quality gate.
- **P2 Build quality gates:** винести `scripts/check-angular-build.sh` в окремий CI job і зробити warning-blocking політику обов’язковою.
