# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-19.

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

## 2) Зміни у цій правці (2026-03-19)

1. Видалено неактуальні/історичні формулювання, залишено тільки поточний стан та наступні кроки.
2. Уніфіковано формулювання «статус → факт → наступна дія» для backend і frontend.
3. Сфокусовано backlog на пунктах, які прямо випливають із ТЗ і ще не закриті.

## 3) Пріоритетний план робіт (від поточного стану)

1. **P0 — Messaging:** перевести RabbitMQ інтеграцію з `RabbitMQ.Client` на MassTransit (producer/consumer + retry + DLQ + outbox/idempotency).
2. **P1 — Search:** замінити `HttpClient`-реалізацію Elasticsearch на офіційний .NET client із typed mapping/templates.
3. **P1 — Frontend decomposition:** розбити великі Angular сторінки (`RootListPageComponent`, `ThreadPageComponent`) на менші standalone-компоненти.
4. **P1 — GraphQL quality:** додати контрактні перевірки GraphQL-запитів/мутацій (включно з негативними кейсами) у CI.
5. **P2 — Architecture quality:** додати автоматичні перевірки дозволених напрямків залежностей між шарами.

## 4) Що ще потрібно у проєкті (коротко)

- Закрити вимоги ТЗ по production-ready messaging (MassTransit + гарантії доставки/повторів).
- Закрити вимоги ТЗ по технологічному стеку пошуку (офіційний Elastic client замість low-level HTTP обгортки).
- Довести фронтенд-структуру до більш підтримуваної (композиція дрібних компонентів + стабільні reactive-патерни).
- Підсилити quality-gates (GraphQL contract checks + architecture checks у CI).

---

Документ оновлюється разом зі змінами фактичного стану реалізації.
