# RabbitMQ consumer runbook (indexing / file-processing)

Документ описує поточну операційну процедуру для RabbitMQ consumer-ланцюга в `Comments.Api` і що саме треба доробити до production-ready стану.

## 1. Поточний контур (що вже є)

- API публікує `comment.created` події у topic-exchange `comments.events` (коли `RabbitMq:Enabled=true`).
- Створюються 2 робочі черги:
  - `indexing` (routing key `comment.created.indexing`),
  - `file-processing` (routing key `comment.created.file-processing`).
- Для кожної черги створюється DLQ із суфіксом `.dlq` через окремий exchange `comments.events.dlx`.
- Consumer використовує `manual ack`, `prefetch=10`, retry через header `x-retry-count` і ліміт `MaxRetryCount`.
- Ідемпотентність наразі in-memory (`ConcurrentDictionary` по `MessageId`) — це **не** персистентний рівень.

## 2. Конфігурація

Базові параметри (з `src/Comments.Api/appsettings.json`):

- `RabbitMq:Enabled` — увімкнути публікацію подій.
- `RabbitMq:ConsumerEnabled` — увімкнути hosted consumer.
- `RabbitMq:ExchangeName` — `comments.events`.
- `RabbitMq:IndexingQueueName` — `indexing`.
- `RabbitMq:FileProcessingQueueName` — `file-processing`.
- `RabbitMq:DeadLetterExchangeName` — `comments.events.dlx`.
- `RabbitMq:DeadLetterQueueSuffix` — `.dlq`.
- `RabbitMq:RetryHeaderName` — `x-retry-count`.
- `RabbitMq:MaxRetryCount` — `3`.

## 3. Швидкий локальний запуск

1. Підняти RabbitMQ (наприклад через docker compose):

```bash
docker compose up -d rabbitmq
```

2. Запустити API з увімкненим RabbitMQ:

```bash
RabbitMq__Enabled=true RabbitMq__ConsumerEnabled=true dotnet run --project src/Comments.Api/Comments.Api.csproj
```

3. Створити тестовий коментар через API/Swagger (або UI) і перевірити логи API:
   - старт consumer-ів,
   - обробка `indexing` / `file-processing`,
   - відсутність помилок retry/DLQ для happy-path.

## 4. Операційні перевірки

### 4.1 Перевірка черг і DLQ

В RabbitMQ Management UI (`http://localhost:15672`) перевірити:

- робочі черги: `indexing`, `file-processing`;
- DLQ: `indexing.dlq`, `file-processing.dlq`;
- routing/bindings до `comments.events` і `comments.events.dlx`;
- зростання `Ready/Unacked` при тестовому навантаженні.

### 4.2 Перевірка retry

Ознака retry: у повідомленні зростає header `x-retry-count`.
Після перевищення `MaxRetryCount` повідомлення має потрапити у відповідний `.dlq`.

## 5. Troubleshooting

- Якщо consumer не стартує:
  - перевірити `RabbitMq:Enabled=true` і `RabbitMq:ConsumerEnabled=true`;
  - перевірити з'єднання (`HostName`, `Port`, `UserName`, `Password`).
- Якщо немає повідомлень у робочих чергах:
  - перевірити, що API реально публікує `comment.created`;
  - перевірити routing keys/bindings.
- Якщо росте DLQ:
  - зібрати проблемні payload + headers;
  - перевірити повторюваність падіння в логах consumer-а;
  - визначити правило requeue/replay після виправлення причини.

## 6. Що ще доробити до production-hardening

1. Перенести ідемпотентність з in-memory на персистентний store (SQL/Redis).
2. Додати метрики (`success/fail/retry`, latency per queue/worker).
3. Формалізувати інтеграційний тест retry → DLQ у CI.
4. Додати процедуру replay DLQ (safe reprocess) та SLO/alert thresholds.
