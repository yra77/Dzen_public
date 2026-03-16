# Dzen_public — стартовий каркас SPA «Коментарі»

У репозиторії підготовлено **базовий backend-каркас на .NET 8** для ТЗ по SPA-коментарях з фокусом на OOP/SOLID і розділення відповідальностей.

## Що вже реалізовано

- `Comments.Domain`:
  - доменна сутність `Comment` з підтримкою вкладених відповідей.
- `Comments.Application`:
  - контракти (`ICommentRepository`, `ITextSanitizer`),
  - DTO,
  - `CommentService` (валідація, санітизація, бізнес-логіка створення/вибірки).
- `Comments.Api`:
  - REST API `POST /api/comments`, `GET /api/comments` (пагінація + сортування),
  - REST API пошуку `GET /api/comments/search?q=...` через Elasticsearch,
  - GraphQL endpoint `POST /graphql` (query comments + mutation createComment),
  - EF Core репозиторій (`InMemory` за замовчуванням + підтримка `SqlServer` через конфіг),
  - базовий HTML sanitizer,
  - Swagger в development-режимі.

## Структура

```text
comments-spa/
├── src/
│   ├── Comments.Api/            # ASP.NET Core + GraphQL + SignalR
│   ├── Comments.Application/    # CQRS/service layer, contracts, DTO
│   ├── Comments.Domain/         # Entities + domain logic
│   ├── Comments.Infrastructure/ # Виділений шар під EF/RabbitMQ/Elasticsearch (scaffold)
│   └── Comments.Web/            # Місце під Angular SPA (scaffold)
├── docker-compose.yml
├── README.md
├── load-test/
└── Comments.sln
```

> Наразі частина інфраструктурної реалізації ще фізично знаходиться в `Comments.Api` і буде поступово винесена в `Comments.Infrastructure` на наступних ітераціях.

## Запуск локально

1. Встановити .NET 8 SDK
2. Виконати:

```bash
dotnet restore Comments.sln
dotnet run --project src/Comments.Api/Comments.Api.csproj
```

3. Відкрити Swagger: `http://localhost:5000/swagger` (або порт, який покаже `dotnet run`).

## Наступні кроки (по ТЗ)

- ✅ Підключено EF Core + підтримку SQL Server (через `Persistence:Provider=SqlServer`).
- ✅ Додано GraphQL (HotChocolate): `comments` query + `createComment` mutation.
- ✅ Додано публікацію події `comment.created` у RabbitMQ (опційно, через конфіг `RabbitMq:Enabled=true`).
- ✅ Додано базову CAPTCHA-перевірку під час створення коментаря (`Captcha:Enabled`, `Captcha:ExpectedToken`).
- ✅ Додано базову підтримку вкладень `image/txt` (base64 upload, валідація типу/розміру, локальне збереження).
- ✅ Додано опційну інтеграцію з Elasticsearch (індексація + пошук).
- ✅ Додано CAPTCHA (Basic + опційно reCAPTCHA), завантаження файлів (image/txt), прев’ю та SignalR.
- Підняти Angular SPA (таблиця, nested thread view).

## Поточний статус реалізації (аудит)

### Готово (підтверджено кодом)

- ✅ **Базова доменна модель і сервісний шар**: сутність коментаря, DTO та сервіс зі створенням/вибіркою.
- ✅ **REST API**:
  - `POST /api/comments`
  - `GET /api/comments` (пагінація + сортування)
- ✅ **GraphQL API**:
  - query `comments`, `searchComments`
  - mutation `createComment`
- ✅ **Persistence**:
  - InMemory провайдер за замовчуванням,
  - SqlServer провайдер через конфіг.
- ✅ **Інтеграція подій**:
  - опційна публікація `comment.created` у RabbitMQ.

### Ще не реалізовано (наступний етап)

1. 🔲 **Elasticsearch**
   - ✅ індексація нових коментарів при створенні,
   - ✅ запити повнотекстового пошуку (`text`, `userName`, `email`),
   - ✅ автоматичний бекфіл/реіндексація історичних даних при старті API (`Elasticsearch:BackfillOnStartup`).
2. 🟨 **Антиспам/безпека для форми**
   - ✅ базова серверна CAPTCHA-перевірка у створенні коментаря,
   - ✅ опційна інтеграція з reCAPTCHA (`Captcha:Provider=Recaptcha`, `Captcha:SecretKey`).
3. 🟨 **Файлові вкладення**
   - ✅ upload `image/txt` через API (base64 payload),
   - ✅ валідація MIME-типу та максимального розміру,
   - ✅ локальне збереження з метаданими в коментарі,
   - 🔲 відображення/preview у SPA.
4. 🟨 **Realtime оновлення**
- ✅ Додано SignalR-хаб `/hubs/comments` і публікацію події `commentCreated` при створенні коментаря.
  - ✅ Додано web-клієнт (SPA) з підключенням до хабу і оновленням UI в реальному часі.
5. 🟨 **Frontend (SPA)**
   - ✅ базова таблиця/дерево коментарів + сортування,
   - ✅ перемикач джерела даних у SPA: REST або GraphQL для list/search/create,
   - ✅ форма створення коментаря з базовою клієнтською валідацією,
   - ✅ перегляд вкладень + клієнтський preview перед відправкою,
   - 🔲 міграція клієнта на Angular (поки реалізовано легкий vanilla JS SPA у `wwwroot`).

### Рекомендований порядок продовження

1. Спершу реалізувати **upload + CAPTCHA** в API (щоб зафіксувати контракт).
2. Далі додати **SignalR** та подію нового коментаря.
3. Після цього підняти **Angular SPA** (інтеграція з REST/GraphQL/SignalR).
4. Завершити **Elasticsearch** як окремий модуль пошуку, не блокуючи базовий CRUD.
