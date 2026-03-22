# Code Walkthrough: Create Comment (E2E сценарій для захисту)

> Оновлено: 2026-03-22  
> Ціль: мати «готову розповідь» на 5–10 хвилин про те, як в проєкті проходить створення коментаря від UI до асинхронних інтеграцій.

---

## 1) Коротка версія (30–60 секунд)

1. Користувач заповнює форму в `Comments.Web`.
2. Frontend відправляє GraphQL mutation у `Comments.Api`.
3. GraphQL resolver викликає MediatR-команду `CreateCommentCommand`.
4. Handler валідовує дані, створює доменну сутність `Comment`, зберігає її через репозиторій (EF Core/MySQL).
5. Після успішного save публікується подія `CommentCreated` через composite publisher.
6. Подія fan-out: realtime push в SignalR + публікація в RabbitMQ + оновлення search index (через канали/consumer-и).
7. UI отримує або відповідь mutation, або realtime-івент і оновлює список/гілку коментарів.

---

## 2) Детальний сценарій по шарах

## Крок A. Frontend: форма і підготовка payload

- Користувач вводить `userName`, `email`, `homePage`, `text`, опційно attachment/captcha.
- Компонент/фасад форми виконує клієнтські валідації (формат email, обов’язкові поля, обмеження на вкладення).
- Через `comments-graphql-api.service.ts` формується mutation payload.

**Що сказати на захисті:**
- «На фронті робимо базову валідацію для UX, але authoritative-валідація завжди на бекенді».

## Крок B. API/GraphQL: вхід у use-case

- Запит приходить на `/graphql`.
- Мутація мапиться на application-команду `CreateCommentCommand`.
- Через MediatR команда передається в `CreateCommentCommandHandler`.
- `ValidationBehavior<,>` + FluentValidation зупиняє invalid payload до виконання бізнес-логіки.

**Що сказати на захисті:**
- «GraphQL endpoint тонкий: він не містить бізнес-логіки, а лише делегує у Application-шар».

## Крок C. Application: бізнес-правила і orchestration

- Handler:
  1. перевіряє/підтягує батьківський коментар (якщо це reply);
  2. нормалізує/sanitize text;
  3. створює доменний `Comment`;
  4. викликає `ICommentRepository.AddAsync(...)`;
  5. викликає `SaveChanges` через unit of work (EF DbContext);
  6. після успіху публікує `CommentCreated` у `ICommentCreatedChannel`.

**Transaction boundary:**
- Гарантуємо атомарність у межах primary write (БД).
- Інтеграційні side-effects виносимо в події/черги (eventual consistency).

## Крок D. Infrastructure: persistence і подійні канали

- `EfCommentRepository` пише дані в таблицю `Comments`.
- `CompositeCommentCreatedPublisher` робить fan-out на кілька каналів:
  - `MassTransitCommentCreatedPublisher` -> RabbitMQ (для асинхронних consumer-ів);
  - `SignalRCommentCreatedChannel` -> push у `/hubs/comments`;
  - `ElasticsearchCommentCreatedChannel` -> індексація для пошуку.

**Idempotency:**
- Consumer-и використовують `ProcessedMessages`, щоб дублікати delivery не призводили до подвійної обробки.

## Крок E. Realtime/UI update

- Сторінки root/thread у Web підписані на hub-подію `commentCreated`.
- Новий коментар мержиться в локальний stream/state (RxJS), без повного перезавантаження сторінки.
- Якщо realtime тимчасово недоступний, UI все одно бачить результат через відповідь mutation + наступний refetch.

---

## 3) Що підкреслює Clean Architecture в цьому сценарії

- Use-case не залежить від HTTP/GraphQL specifics.
- Use-case не залежить від RabbitMQ/SignalR/Elasticsearch напряму — лише від абстракції каналу.
- Інфраструктурні адаптери можна міняти без переписування `CreateCommentCommandHandler`.

---

## 4) Типові питання на захисті + короткі відповіді

### П: «Чому не робите все синхронно в одному request?»
**В:** Бо side-effects (indexing, notifications, file-processing) під навантаженням зроблять API повільним і крихким. Черги + події знижують latency основного write-path.

### П: «Що буде, якщо Elasticsearch або RabbitMQ недоступні?»
**В:** Primary write у БД не залежить від них. Система переходить у degraded mode: коментар збережений, а індексація/пуш наздоженуть через retry/consumer recovery.

### П: «Як уникнути повторної обробки повідомлень?»
**В:** Через idempotency store (`ProcessedMessages`) на рівні consumer-а.

### П: «Де тут SOLID?»
**В:**
- SRP: handler лише orchestrates use-case;
- DIP: handler працює через інтерфейси (`ICommentRepository`, `ICommentCreatedChannel`);
- OCP: новий downstream-канал додається новою реалізацією без змін ядра.

---

## 5) Міні-шпаргалка для усної презентації (3–5 хв)

1. «Починаємо з форми у фронті, але ключова валідація на бекенді».  
2. «GraphQL тонкий — передає команду у MediatR».  
3. «Handler пише у БД в межах transaction boundary».  
4. «Після коміту йде fan-out події в RabbitMQ/SignalR/ES».  
5. «UI отримує update через mutation response або realtime push».  
6. «Архітектурна вигода: слабке зв’язування, масштабованість, стійкість до часткових збоїв».  

