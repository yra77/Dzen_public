# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-20.

> Документ містить тільки актуальний стан реалізації та робочий план без історичних/застарілих приміток.

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
| Angular (standalone components) | ✅ Виконується за планом | `Comments.Web` працює на standalone-компонентах; дерево винесено в `CommentTreeComponent`, вкладення перегляду — у `CommentAttachmentComponent`, submit-помилки форм — у `FormSubmitFeedbackComponent`, блоки attachment/CAPTCHA — у `CommentAttachmentPickerComponent` і `CaptchaInputComponent`, поля автора+тексту+quick-tags+preview — у `CommentAuthorTextFieldsComponent`, header/actions модалок — у `CommentModalHeaderComponent` та `CommentFormActionsComponent`, layout модалки (`backdrop/panel`) — у `CommentModalLayoutComponent`. | Далі: зафіксувати єдиний modal API (test-id/режими закриття) і поширити на всі майбутні modal-сценарії без дублювання. |
| Apollo Client (GraphQL) | ✅ Виконано | Apollo Angular інтегровано; запити/мутації працюють через GraphQL API. | Нормалізувати cache-policy та обробку мережевих/GraphQL помилок. |
| RxJS | ✅ Виконано | RxJS використовується в сервісах та UI-компонентах. | Уніфікувати потоки стану для сценаріїв list/thread/search/realtime. |
| Якість збірки (Angular compiler warnings) | ✅ Виконано | Поточна SPA збірка проходить без доданих у цій ітерації попереджень компілятора. | Закріпити вимогу окремим CI-кроком із fail при warning/error. |

## 2) Пріоритетний план робіт

1. **P0 — Messaging:** перевести RabbitMQ інтеграцію з `RabbitMQ.Client` на MassTransit (producer/consumer + retry + DLQ + outbox/idempotency).
2. **P1 — Search:** замінити `HttpClient`-реалізацію Elasticsearch на офіційний .NET client із typed mapping/templates.
3. **P1 — Frontend decomposition:** стандартизувати modal API у shared-компонентах (керування backdrop-close, test-id, перевикористання в нових сценаріях), зберігаючи сторінки `RootListPageComponent` і `ThreadPageComponent` тонкими.
4. **P1 — GraphQL quality:** додати контрактні перевірки GraphQL-запитів/мутацій (включно з негативними кейсами) у CI.
5. **P2 — Architecture quality:** додати автоматичні перевірки дозволених напрямків залежностей між шарами.
6. **P2 — Build quality gates:** додати окремий CI-крок на fail при Angular warning/error у production-збірці.

## 3) Що внесено в цій ітерації

- Продовжено frontend-декомпозицію за планом: додано standalone-компонент `CommentModalLayoutComponent` для перевикористання modal-layout (`backdrop + panel`) у create/reply сценаріях.
- На сторінках `RootListPageComponent` і `ThreadPageComponent` прибрано дублювання розмітки/стилів контейнера модального вікна, замінено на shared layout-компонент.
- Актуалізовано чекліст: видалено неактуальні кроки про «наступним кроком винести modal layout», оскільки цей крок вже реалізовано.

## 4) Що ще треба зробити у проєкті

- Закрити вимоги ТЗ по production-ready messaging: перейти на MassTransit і додати retry/DLQ/outbox/idempotency.
- Закрити вимоги ТЗ по стеку пошуку: перейти з low-level HTTP-обгортки на офіційний Elasticsearch .NET client.
- Довести frontend-декомпозицію до DoD: узгодити й закріпити єдиний modal API (включно з test-id і варіантами закриття) для нових UI-сценаріїв.
- Підсилити quality-gates: додати GraphQL contract checks, architecture checks та перевірку збірки без Angular warnings у CI/CD.
- Формалізувати DoD для ТЗ: чекліст «готово до релізу» з прив’язкою до автоперевірок.
