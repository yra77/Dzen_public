# Результати Middle+ load-test (`comments-middle.js`)

> Статус: шаблон для заповнення після фактичного прогона у середовищі з увімкненими RabbitMQ + Elasticsearch.

## 1) Контекст запуску

- Дата/час:
- Середовище (локальне/stage/prod-like):
- API base URL:
- API mode (`rest`/`graphql`/`mixed`):
- Версія коміту/гілка:
- Налаштування CAPTCHA (`CAPTCHA_TOKEN`):
- RabbitMQ: увімкнено / вимкнено
- Elasticsearch: увімкнено / вимкнено

## 2) Команда запуску

```bash
k6 run --summary-export=docs/artifacts/k6-middle-summary.json load-test/comments-middle.js
```

> За потреби:
>
> ```bash
> API_MODE=graphql CAPTCHA_TOKEN=test k6 run --summary-export=docs/artifacts/k6-middle-graphql-summary.json load-test/comments-middle.js
> ```

## 3) Ключові метрики (заповнити)

- `http_req_failed`:
- `http_req_duration` p95:
- `http_req_duration` p99:
- `create_latency_ms` p95:
- `list_latency_ms` p95:
- `search_latency_ms` p95:
- `graphql_latency_ms` p95:
- `create_failed_rate`:

## 4) Thresholds vs фактичний результат

| Threshold | Очікування | Факт | Статус |
|---|---:|---:|---|
| `http_req_failed` | `< 2%` |  |  |
| `http_req_duration p95` | `< 700ms` |  |  |
| `http_req_duration p99` | `< 1200ms` |  |  |
| `create_latency_ms p95` | `< 900ms` |  |  |
| `list_latency_ms p95` | `< 500ms` |  |  |
| `search_latency_ms p95` | `< 650ms` |  |  |
| `graphql_latency_ms p95` | `< 700ms` |  |  |
| `create_failed_rate` | `< 5%` |  |  |

## 5) Висновок

- Загальний статус прогона (pass/fail):
- Основні вузькі місця:
- Рекомендації до оптимізації:
- Посилання на артефакти (`summary.json`, скріншоти, дашборди):
