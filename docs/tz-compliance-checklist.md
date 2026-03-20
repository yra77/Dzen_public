# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-20.

> Документ містить тільки актуальний стан реалізації та поточний план без застарілих нотаток.

## 1) Матриця відповідності ТЗ (актуально)

### Backend

| Вимога ТЗ | Статус | Поточний стан у репозиторії | Що робимо далі |
|---|---|---|---|
| ASP.NET Core 8.0 (LTS) | ✅ Виконано | `Comments.Api`, `Comments.Application`, `Comments.Domain`, `Comments.Infrastructure` таргетують `net8.0`. | Підтримувати patch-оновлення .NET 8. |
| Entity Framework Core + SQLite | ✅ Виконано | У `Program.cs` активний `UseSqlite(...)` за `Persistence:Provider=Sqlite`, міграції застосовуються через `Database.MigrateAsync()`. | Підтримувати консистентність SQLite-міграцій під зміни моделі. |
| GraphQL (HotChocolate) | ✅ Виконано | Піднято endpoint `/graphql`, працюють `CommentQueries` і `CommentMutations`. | Додати контрактні перевірки GraphQL-схеми/операцій у CI. |
| CQRS + MediatR | ✅ Виконано | Команди/запити винесені в `Comments.Application`, у pipeline підключено `ValidationBehavior`. | Додати e2e перевірки CQRS-сценаріїв. |
| RabbitMQ (MassTransit) | ⚠️ Частково | Використовується `RabbitMQ.Client` (publisher + consumer hosted service), MassTransit поки не інтегрований. | Міграція на MassTransit: retry, DLQ, outbox, idempotency. |
| Elasticsearch (офіційний .NET client) | ⚠️ Частково | Пошук/індексація реалізовані через `HttpClient`-адаптери; `Elasticsearch.Enabled` керує вмиканням. | Перейти на офіційний .NET client Elasticsearch + typed mapping/templates. |
| SignalR | ✅ Виконано | Працює `CommentsHub` і endpoint `/hubs/comments`, подія створення коментаря розсилається realtime-каналом. | Додати регрес-перевірки reconnect/backoff сценаріїв. |
| Clean Architecture + SOLID | ✅ Базово виконано | Розділено шари Domain/Application/Infrastructure/Api, інфраструктурні реалізації інтерфейсів винесені в Infrastructure. | Додати automated architecture-guard перевірки залежностей між шарами. |

### Frontend

| Вимога ТЗ | Статус | Поточний стан у репозиторії | Що робимо далі |
|---|---|---|---|
| Angular (standalone components) | ✅ Виконується за планом | `Comments.Web` працює на standalone-компонентах; повторюваний блок вкладень винесено в окремий `CommentAttachmentComponent`. | Продовжити декомпозицію великих page-компонентів на feature/ui блоки (форми, дерево коментарів, модалки). |
| Apollo Client (GraphQL) | ✅ Виконано | Apollo Angular інтегровано; запити/мутації працюють через GraphQL API. | Нормалізувати cache-policy та обробку мережевих/GraphQL помилок. |
| RxJS | ✅ Виконано | RxJS використовується в сервісах та UI-компонентах. | Уніфікувати потоки стану для сценаріїв листинг/тред/пошук/realtime. |

## 2) Пріоритетний план робіт (наступні кроки)

1. **P0 — Messaging:** перевести RabbitMQ інтеграцію з `RabbitMQ.Client` на MassTransit (producer/consumer + retry + DLQ + outbox/idempotency).
2. **P1 — Search:** замінити `HttpClient`-реалізацію Elasticsearch на офіційний .NET client із typed mapping/templates.
3. **P1 — Frontend decomposition:** продовжити винесення повторюваних UI-блоків зі сторінок `RootListPageComponent` і `ThreadPageComponent` в окремі standalone-компоненти.
4. **P1 — GraphQL quality:** додати контрактні перевірки GraphQL-запитів/мутацій (включно з негативними кейсами) у CI.
5. **P2 — Architecture quality:** додати автоматичні перевірки дозволених напрямків залежностей між шарами.

## 3) Що вже внесено та що ще потрібно

### Внесено в поточній ітерації

- Актуалізовано цей checklist: прибрано застарілі формулювання та залишено тільки поточний стан/план.
- Розпочато декомпозицію frontend за планом: повторюваний рендер вкладень у списку та гілці винесено в спільний standalone-компонент.

### Що ще потрібно зробити в проєкті

- Закрити вимоги ТЗ по production-ready messaging: перейти на MassTransit і додати retry/DLQ/outbox/idempotency.
- Закрити вимоги ТЗ по стеку пошуку: перейти з low-level HTTP-обгортки на офіційний Elasticsearch .NET client.
- Продовжити декомпозицію frontend-сторінок: винести форму створення/відповіді, дерево коментарів та модальні блоки у менші компоненти.
- Підсилити quality-gates: додати GraphQL contract checks та architecture checks у CI/CD.
- Формалізувати DoD для ТЗ: чекліст «готово до релізу» з прив’язкою до автоперевірок.
