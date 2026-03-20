# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-20.

> Документ містить **лише актуальний стан** реалізації і поточний план робіт без історичних/застарілих нотаток.

## 1) Матриця відповідності ТЗ (поточний стан)

### Backend

| Вимога ТЗ | Статус | Поточний стан у репозиторії | Що робимо далі |
|---|---|---|---|
| ASP.NET Core 8.0 (LTS) | ✅ Виконано | `Comments.Api`, `Comments.Application`, `Comments.Domain`, `Comments.Infrastructure` таргетують `net8.0`. | Підтримувати patch-оновлення .NET 8. |
| Entity Framework Core + SQLite | ✅ Виконано | У `Program.cs` активний `UseSqlite(...)` за `Persistence:Provider=Sqlite`, міграції застосовуються на старті через `Database.MigrateAsync()`. | Підтримувати консистентність SQLite-міграцій під зміни моделі. |
| GraphQL (HotChocolate) | ✅ Виконано | Піднято endpoint `/graphql`, працюють `CommentQueries` і `CommentMutations`. | Додати контрактні перевірки GraphQL-схеми/операцій у CI. |
| CQRS + MediatR | ✅ Виконано | Команди/запити винесені в `Comments.Application`, в pipeline підключено `ValidationBehavior`. | Додати інтеграційні перевірки end-to-end CQRS-сценаріїв. |
| RabbitMQ (MassTransit) | ⚠️ Частково | Використовується `RabbitMQ.Client` (publisher + consumer hosted service), MassTransit поки не інтегрований. | Міграція на MassTransit: retry, DLQ, outbox, idempotency. |
| Elasticsearch (офіційний .NET client) | ⚠️ Частково | Пошук/індексація реалізовані через `HttpClient`-адаптери; `Elasticsearch.Enabled` керує вмиканням. | Перейти на офіційний .NET client Elasticsearch + typed mapping/templates. |
| SignalR | ✅ Виконано | Працює `CommentsHub` і endpoint `/hubs/comments`, подія створення коментаря розсилається каналом realtime. | Додати регрес-перевірки reconnect/backoff сценаріїв. |
| Clean Architecture + SOLID | ✅ Базово виконано | Розділено шари Domain/Application/Infrastructure/Api, інфраструктурні реалізації інтерфейсів винесені в Infrastructure. | Додати automated architecture-guard перевірки залежностей між шарами. |

### Frontend

| Вимога ТЗ | Статус | Поточний стан у репозиторії | Що робимо далі |
|---|---|---|---|
| Angular (standalone components) | ✅ Виконано | `Comments.Web` побудовано на standalone-компонентах. | Продовжити декомпозицію великих page-компонентів на feature/ui блоки. |
| Apollo Client (GraphQL) | ✅ Виконано | Apollo Angular інтегровано; запити/мутації працюють через GraphQL API. | Нормалізувати cache-policy та обробку мережевих/GraphQL помилок. |
| RxJS | ✅ Виконано | RxJS активно використовується в сервісах та UI-компонентах. | Уніфікувати потоки стану для довгих сценаріїв (листинг/тред/пошук/realtime). |

## 2) Пріоритетний план робіт (від поточного стану)

1. **P0 — Messaging:** перевести RabbitMQ інтеграцію з `RabbitMQ.Client` на MassTransit (producer/consumer + retry + DLQ + outbox/idempotency).
2. **P1 — Search:** замінити `HttpClient`-реалізацію Elasticsearch на офіційний .NET client із typed mapping/templates.
3. **P1 — Frontend decomposition:** розбити великі Angular сторінки (`RootListPageComponent`, `ThreadPageComponent`) на менші standalone-компоненти.
4. **P1 — GraphQL quality:** додати контрактні перевірки GraphQL-запитів/мутацій (включно з негативними кейсами) у CI.
5. **P2 — Architecture quality:** додати автоматичні перевірки дозволених напрямків залежностей між шарами.

## 3) Що ще потрібно у проєкті (коротко)

- Закрити вимоги ТЗ по production-ready messaging: перейти на MassTransit і додати retry/DLQ/outbox/idempotency.
- Закрити вимоги ТЗ по технологічному стеку пошуку: перейти з low-level HTTP-обгортки на офіційний Elasticsearch .NET client.
- Довести фронтенд-структуру до більш підтримуваної: декомпозувати page-компоненти на feature/ui-блоки та стабілізувати reactive-потоки.
- Підсилити quality-gates: додати GraphQL contract checks та architecture checks у CI/CD.
- Формалізувати DoD для ТЗ: чекліст «готово до релізу» з прив’язкою до автоперевірок (щоб статуси не оновлювалися вручну).

## 4) Внесені зміни в цій ітерації (2026-03-20)

1. Видалено неактуальний розділ з попередньою датою правки, залишено тільки поточний стан і актуальний backlog.
2. Уточнено формулювання наступних кроків під фактичний стан репозиторію (messaging/search/frontend/quality).
3. Додано окремий пункт про DoD і автоматизацію перевірок відповідності ТЗ, щоб спростити контроль прогресу.

---

Документ оновлюється разом зі змінами фактичного стану реалізації.
