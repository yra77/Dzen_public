# RabbitMQ Consumer Runbook (comments task queues)

Оновлено: 2026-03-17 (ітерація 64).

## 1) Alert-пороги (орієнтир для monitor/alerting)

Для кожного worker (`indexing`, `file-processing`) застосовується ковзне вікно останніх `WindowSize` повідомлень.

Базові пороги (див. `RabbitMq:Alerts`):

- **Warning**:
  - `failure-rate >= 5%` **або**
  - `average-latency >= 250ms`.
- **Critical**:
  - `failure-rate >= 15%` **або**
  - `average-latency >= 1000ms`.

> Налаштування порогів та розміру вікна конфігуруються через `appsettings` без перекомпіляції.

## 2) DLQ replay-flow (формалізована процедура)

### 2.1 Передумови

1. Перевірити, що усунуто причину падіння consumer-а (інфраструктура, контракт payload, БД тощо).
2. Перевірити health API та доступність RabbitMQ.
3. Зафіксувати поточний розмір DLQ:
   - `indexing.dlq`
   - `file-processing.dlq`

### 2.2 Безпечне відновлення

1. **Зупинити** API/consumer інстанси або перевести deployment у maintenance-mode, щоб уникнути гонок.
2. Для кожного повідомлення з DLQ:
   - скопіювати `body` без змін;
   - встановити `MessageId` (залишити оригінальний або згенерувати, якщо відсутній);
   - скинути/видалити retry-header `x-retry-count`;
   - опублікувати назад у `comments.events` з оригінальним routing key (`comment.created.indexing` або `comment.created.file-processing`).
3. Підняти API/consumer інстанси.
4. Моніторити:
   - `comments_rabbitmq_consumer_success_total`;
   - `comments_rabbitmq_consumer_failed_total`;
   - `comments_rabbitmq_consumer_retry_total`;
   - `comments_rabbitmq_consumer_latency_ms`;
   - нові warning/critical логи за порогами.

### 2.3 Критерії успішного replay

- DLQ-черги повернулись до очікуваного рівня (0 або операційний baseline).
- Протягом контрольного інтервалу немає сталого росту `failed_total` і повторного накопичення DLQ.
- Failure-rate та average-latency не перевищують warning-порогів на стабільному трафіку.

## 3) Rollback

Якщо після replay failure-rate зростає:

1. Зупинити replay.
2. Повернути service до попередньої стабільної версії (за потреби).
3. Зберегти проблемні повідомлення з DLQ для root-cause аналізу.
4. Створити postmortem із переліком corrective actions.
