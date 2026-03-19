# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-19.

> Цей чекліст оновлено після повторної верифікації коду проєкту проти заявленого стеку з ТЗ.
> Неактуальні пункти про «повний перехід на SQLite як цільовий стек ТЗ» видалено.

## 1) Матриця відповідності ТЗ (стан на зараз)

### Backend

| Вимога ТЗ | Статус | Факт у проєкті | Що потрібно доробити |
|---|---|---|---|
| ASP.NET Core 8.0 (LTS) | ✅ Виконано | `Comments.Api` таргетує `net8.0`. | Підтримувати оновлення patch-релізів .NET 8. |
| Entity Framework Core + **MS SQL Server** | ⚠️ Частково | EF Core є, але поточний production-like provider у коді/конфігу — **SQLite** (`UseSqlite`, `Microsoft.EntityFrameworkCore.Sqlite`). | Повернути/додати SQL Server provider (`UseSqlServer`), SQL Server-міграції та профіль запуску з MSSQL у docker-compose. |
| GraphQL (HotChocolate) | ✅ Виконано | Підключено `HotChocolate.AspNetCore`, зареєстровані query/mutation, endpoint `/graphql`. | Додати контрактні інтеграційні тести GraphQL (query/mutation/error shape). |
| CQRS + MediatR | ✅ Виконано | Є окремі `Commands`/`Queries`, використовується `MediatR` + pipeline validation behavior. | Покрити ключові CQRS-ланцюжки додатковими integration/e2e тестами. |
| RabbitMQ (**MassTransit**) | ⚠️ Частково | RabbitMQ інтеграція є через `RabbitMQ.Client`, але **MassTransit** відсутній. | Мігрувати транспортний шар на MassTransit (publisher/consumer, retry, DLQ policy, idempotency). |
| Elasticsearch (**NEST**) | ⚠️ Частково | Elasticsearch інтеграція реалізована через `HttpClient`, **NEST/Elastic .NET client** не використовується. | Замінити на офіційний клієнт (NEST/Elastic Client), додати typed mappings/index templates. |
| SignalR | ✅ Виконано | `AddSignalR`, `CommentsHub`, endpoint `/hubs/comments` присутні. | Додати перевірки reconnect/backoff сценаріїв у фронтенд e2e. |
| Clean Architecture + SOLID | ⚠️ Частково | Є поділ на `Domain / Application / Api / Web`, абстракції в `Application`. | Винести інфраструктурні реалізації з `Comments.Api` у `Comments.Infrastructure` (зараз шар лишається scaffold). |

### Frontend

| Вимога ТЗ | Статус | Факт у проєкті | Що потрібно доробити |
|---|---|---|---|
| Angular (standalone components) | ✅ Виконано | Angular 19; компоненти оголошені через standalone-підхід (`imports` у `@Component`). | Уніфікувати component-level style/testing conventions. |
| Apollo Client (GraphQL) | ❌ Не виконано | На фронтенді використовується `HttpClient`/REST, Apollo-залежності та GraphQL client layer відсутні. | Додати Apollo Angular (`apollo-angular`, `@apollo/client`, cache policies) і перевести критичні сценарії на GraphQL. |
| RxJS | ✅ Виконано | `rxjs` присутній у залежностях та використовується у сервісах. | Розширити reactive state-патерни там, де зараз імперативна логіка у компонентах. |

## 2) Що вже внесено у цей чекліст

1. Видалено неактуальну частину, яка фіксувала SQLite як повну відповідність ТЗ по persistence.
2. Додано нову матрицю відповідності по кожній вимозі з прозорими статусами: ✅ / ⚠️ / ❌.
3. Додано concrete backlog-пункти: MSSQL, MassTransit, NEST/Apollo, а також архітектурне рознесення Infrastructure.
4. Уточнено, що SQLite зараз — фактична реалізація, але не цільовий стан згідно стеку ТЗ.

## 3) Пріоритетний план робіт для доведення до повної відповідності ТЗ

1. **P0 — База даних під ТЗ:**
   - Повернути SQL Server provider у `Program.cs` (через `UseSqlServer`) з конфігурацією `Persistence:Provider = SqlServer`.
   - Додати SQL Server міграції та профіль локального/CI запуску MSSQL.

2. **P0 — Транспорт подій:**
   - Мігрувати з `RabbitMQ.Client` на **MassTransit**.
   - Додати політики retry, outbox/idempotency та dead-letter handling.

3. **P1 — Elasticsearch client:**
   - Перейти на **NEST/Elastic .NET client** з типізованими DTO для індексації/пошуку.
   - Додати health-check і backfill-перевірки для індексу.

4. **P1 — Frontend GraphQL:**
   - Підключити Apollo Client.
   - Реалізувати GraphQL query/mutation потік щонайменше для: список коментарів, thread, create comment.

5. **P1 — Clean Architecture hardening:**
   - Перенести всі infrastructure-адаптери з `Comments.Api/Infrastructure` до `Comments.Infrastructure`.
   - Залишити в `Comments.Api` лише композиційний root і transport/web concerns.

6. **P2 — Якість та верифікація:**
   - Розширити integration tests для MSSQL + GraphQL + messaging.
   - Оновити QA/go-no-go скрипти під нову цільову конфігурацію.

## 4) Нагадування про правило документування

- При редагуванні або створенні **нових класів/методів** обов'язково додаємо коментарі:
  - для C# публічних елементів — XML-коментарі `///`;
  - для складних ділянок логіки — короткі пояснювальні inline-коментарі.

---

Файл підтримується як живий чекліст відповідності ТЗ; після кожної суттєвої технічної зміни статуси в матриці мають бути оновлені в той же PR.
