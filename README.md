# Dzen — SPA Коментарі

Репозиторій містить **поточну реалізацію SPA-застосунку коментарів** на базі:
- backend на **.NET 10 + GraphQL (HotChocolate)**;
- frontend на **Angular (standalone SPA)**;
- realtime-оновлення через **SignalR**;
- пошук - **Elasticsearch**;
- збереження даних через **EF Core + SQLite**.

> Важливо: у поточному контракті застосунку **немає Swagger і REST API** — використовується **GraphQL-only**.

## Поточна архітектура

```text
Dzen_public/
├── src/
│   ├── Comments.Api/            # ASP.NET Core host + GraphQL endpoint + SignalR hub + static hosting SPA
│   ├── Comments.Application/    # Бізнес-логіка, CQRS, валідація
│   ├── Comments.Domain/         # Доменні сутності
│   ├── Comments.Infrastructure/ # Persistence/search/messaging/realtime/captcha/storage
│   └── Comments.Web/            # Angular SPA
└── Comments.sln
```

## Варіант 1: запуск через Docker (backend + web)

1. Переконайтесь, що встановлено Docker + Docker Compose.
2. У корені репозиторію виконайте:

```bash
docker compose up --build
```

Після старту доступно:
- Web (Angular через Nginx): `http://localhost:4200`
- Backend (GraphQL API): `http://localhost:5000/graphql`
- RabbitMQ management: `http://localhost:15672`
- Elasticsearch: `http://localhost:9200`

> Примітка: frontend налаштований на `http://localhost:5000` як API base URL, тому працює з backend у Docker без додаткових правок.

## Варіант 2: локальний запуск (backend окремо + web через `npm start`)

### Передумови
- .NET 10 SDK
- Node.js LTS (щоб запускати web через `npm start`)

### Кроки
1. Відновити NuGet-пакети:

```bash
dotnet restore Comments.sln
```

2. Встановити npm-залежності frontend:

```bash
cd src/Comments.Web
npm ci
cd ../..
```

3. Запустити backend:

```bash
dotnet run --project src/Comments.Api/Comments.Api.csproj
```

4. В окремому терміналі запустити web:

```bash
cd src/Comments.Web
npm start
```

5. Відкрити SPA у браузері за URL, який покаже Angular dev server (зазвичай `http://localhost:4200`).


## Де міняти URI/Host при зміні стенду

Якщо переносиш застосунок на інший сервер/домен/порт, онови **обидва** файли:

1. `src/Comments.Web/src/environments/environment.ts`
   - **рядок 2**: `API_BASE_URL`
   - Приклад: `const API_BASE_URL = 'http://YOUR_HOST:5000';`

2. `src/Comments.Api/appsettings.json`
   - **рядок 7**: `RabbitMq.HostName` (якщо RabbitMQ на іншому хості)
   - **рядок 34**: `Networking.ApiListenUrls` (де слухає API)
   - **рядок 62**: `Elasticsearch.Uri` (якщо змінено Elasticsearch host/port)
   - **рядки 74–77**: `Cors.AllowedOrigins` (додай/онови origin фронтенду)

Після зміни конфігурації рекомендовано перезапустити backend і frontend.
