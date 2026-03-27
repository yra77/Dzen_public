# Dzen_public — SPA «Коментарі» (актуальний стан)

Репозиторій містить **поточну реалізацію SPA-застосунку коментарів** на базі:
- backend на **.NET 8 + GraphQL (HotChocolate)**;
- frontend на **Angular (standalone SPA)**;
- realtime-оновлення через **SignalR**;
- збереження даних через **EF Core + SQLite**.

> Важливо: у поточному контракті застосунку **немає Swagger, REST API та k6 load-testing сценаріїв**.

## Поточна архітектура

```text
Dzen_public/
├── src/
│   ├── Comments.Api/            # ASP.NET Core host + GraphQL endpoint + SignalR hub + static hosting SPA
│   ├── Comments.Application/    # Бізнес-логіка, CQRS, валідація
│   ├── Comments.Domain/         # Доменні сутності
│   ├── Comments.Infrastructure/ # Persistence/search/messaging/realtime/captcha/storage
│   └── Comments.Web/            # Angular SPA
├── docs/                        # Чеклісти, runbook, handoff-документація
├── scripts/                     # Перевірки стенду та smoke/go-no-go
└── Comments.sln
```

## Що реалізовано

- **Єдиний API-контракт: GraphQL** (`/graphql`) для читання/створення коментарів.
- **Realtime-повідомлення** про нові коментарі через `SignalR` (`/hubs/comments`).
- **SQLite persistence** з автозастосуванням EF Core міграцій під час запуску.
- **Fallback-ready search pipeline** та інфраструктурні розширення в `Comments.Infrastructure`.
- **Angular SPA** з деревом коментарів, формами, preview вкладень і адаптивним UI.

## Локальний запуск

1. Встановити .NET 8 SDK та Node.js LTS.
2. Відновити залежності:

```bash
dotnet restore Comments.sln
cd src/Comments.Web && npm ci && cd ../..
```

3. Запустити застосунок:

```bash
dotnet run --project src/Comments.Api/Comments.Api.csproj
```

4. Відкрити SPA у браузері за URL, який виведе `dotnet run`.

## Docker: підняти backend + web разом

```bash
docker compose up --build
```

Після старту:
- Web (Angular через Nginx): `http://localhost:4200`
- Backend (GraphQL API): `http://localhost:5000/graphql`
- RabbitMQ management: `http://localhost:15672`
- Elasticsearch: `http://localhost:9200`

> Примітка: фронтенд використовує `http://localhost:5000` як API base URL, тому з браузера на хості він працює з контейнеризованим backend без додаткових змін.

## QA / smoke перевірки

Перед handoff у QA використовуйте:

```bash
./scripts/qa-stand-check.sh --report-file docs/artifacts/qa-stand-check.json
./scripts/go-no-go-check.sh --report-file docs/artifacts/go-no-go-check.json
```

## Актуальний план продовження робіт

- **P0:** GraphQL contract hardening (schema snapshots + compatibility checks).
- **P0:** E2E критичних SPA user-flow (list/thread/reply/search/realtime/captcha).
- **P1:** Accessibility та mobile regression (keyboard/navigation + viewport matrix).
- **P1:** Security evidence (XSS/attachment/captcha abuse негативні сценарії).
- **P2:** Release handoff і фінальний пакет артефактів у `docs/artifacts`.

## Джерело істини

Актуальний статус відповідності ТЗ, прогрес і backlog ведеться в:
- `docs/tz-compliance-checklist.md`
