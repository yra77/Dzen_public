# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-24.

> Документ очищено від застарілих пунктів і синхронізовано з поточним станом GraphQL-first бекенду та фактичним статусом публічного доступу.

## 1) Що перевірено в цій ітерації

- `src/Comments.Api/GraphQL`:
  - підтверджено, що ключові сценарії SPA покриті через Query/Mutation (list/thread/search/preview/create/captcha/attachment text preview).
- `src/Comments.Api/Program.cs`:
  - CORS-політика дозволяє клієнтів `http://192.168.0.106:4200` і `http://46.119.236.29:4200`.
  - Додано підтримку явного listen URL (`Networking:ApiListenUrls` / `ASPNETCORE_URLS`) для bind на `0.0.0.0:5000`.
- `src/Comments.Web/src/environments/environment.ts`:
  - API base URL вказано на `http://46.119.236.29:5000` для доступу SPA поза localhost.
- `src/Comments.Web/package.json`:
  - dev-server запускається з `--host 0.0.0.0 --port 4200`, тож SPA може бути доступна через зовнішню IP при коректному port-forwarding.

## 2) Актуальна матриця відповідності ТЗ

### Backend

| Вимога | Статус | Підтвердження | Наступний крок |
|---|---|---|---|
| ASP.NET Core 8 | ✅ | API конфігурується в `Program.cs` | Тримати runtime/SDK patch-релізи актуальними |
| EF Core + SQLite | ✅ | SQLite підключення + міграції на старті | Додати smoke test cold-start з порожньою БД |
| Presentation GraphQL Server (HotChocolate) | ✅ | `CommentQueries` + `CommentMutations` + error filters + `/graphql` endpoint | Додати контрактні snapshot-тести GraphQL schema/errors |
| CQRS + MediatR | ✅ | Команди/запити і `ValidationBehavior` в application layer | Додати e2e сценарії create/reply/search |
| RabbitMQ + MassTransit | ✅ | transport, consumers, retry/outbox/idempotency налаштовані | Додати CI smoke з брокером |
| Elasticsearch | ✅ | index initializer + backfill + resilient fallback | Додати CI-перевірку індексації |
| SignalR realtime | ✅ | Hub і канал подій нових коментарів | Додати reconnect/backoff e2e |

### Frontend

| Вимога | Статус | Підтвердження | Наступний крок |
|---|---|---|---|
| Angular standalone SPA | ✅ | Standalone-компоненти і маршрути root/thread | Додати e2e smoke по маршрутах |
| Пагінація (25 за замовчуванням) | ✅ | Дефолтний `pageSize=25`, є summary | Додати e2e-перевірки summary при переходах |
| Сортування root-коментарів | ✅ | Підтримка поля і напрямку сортування | Додати e2e-матрицю комбінацій sort |
| Вкладені відповіді | ✅ | Дерево коментарів з рекурсивним merge | Додати stress e2e для глибоких дерев |
| Preview + quick-tags | ✅ | Є preview-flow і toolbar тегів | Додати keyboard/accessibility кейси |
| Lightbox для зображень | ✅ | Реалізовано модальне переглядання image-вкладень | Додати e2e для close-by-click/ESC |

## 3) Вкладення і валідації

| Вимога | Статус | Підтвердження | Наступний крок |
|---|---|---|---|
| Формати PNG/JPG/GIF/TXT | ✅ | MIME-типи обмежено у backend-валідації | Додати контрактний тест на заборонений MIME |
| TXT до 100 KB | ✅ | Є перевірка ліміту для `text/plain` | Додати boundary-тести 100KB / 100KB+1 |
| Resize image до 320×240 | ✅ | Нормалізація з max width/height у storage | Додати інтеграційний тест на велике зображення |
| XSS-захист | ✅ | Серверна санітизація + frontend-валідація фрагментів | Додати security-regression suite |

## 4) Що вже зроблено в проєкті (актуально)

- Бекенд працює через GraphQL-first presentation layer (HotChocolate) без публічного REST-контракту.
- Реалізовано SPA-сценарії: root list, thread, reply, preview, quick-tags, realtime merge.
- Налаштовано контейнеризацію для локального запуску через `docker-compose`.
- Додано базову конфігурацію для зовнішнього доступу до SPA/API через `46.119.236.29`.
- Для API додано конфігураційний bind на всі мережеві інтерфейси (`0.0.0.0:5000`).

## 5) Що змінено в цьому оновленні документа

1. Видалено застарілі формулювання, що дублювали проміжні стани старих ітерацій.
2. Зафіксовано актуальні мережеві налаштування (CORS + listen URL) для доступу без `localhost`.
3. Додано практичний чекліст для кейсу `ERR_CONNECTION_REFUSED` на `46.119.236.29:5000`.

## 6) Що ще потрібно зробити в проєкті

1. **P0 — GraphQL contract hardening**
   - Зафіксувати snapshot schema і помилки валідації/бізнес-правил.
   - Додати перевірки backward compatibility для ключових полів/операцій.
2. **P0 — E2E критичні сценарії SPA**
   - Закрити list/thread/search/preview/reply/captcha/realtime на рівні e2e.
3. **P1 — Security evidence**
   - Додати негативні сценарії XSS, валідацію вкладень та CAPTCHA abuse-перевірки.
4. **P1 — QA evidence в артефакти**
   - Прогнати `scripts/qa-stand-check.sh` і `scripts/go-no-go-check.sh` у повному стеку.
   - Зберегти результати в `docs/artifacts/`.
5. **P1 — Network hardening для публічного доступу**
   - Закріпити статичну LAN IP (`192.168.0.106`) на сервері/роутері.
   - Налаштувати port-forwarding для `4200` (SPA) і `5000` (API), за потреби `80/443` через reverse proxy.
   - Додати TLS (Nginx/Caddy + Let's Encrypt), щоб перейти з `http` на `https`.
6. **P2 — Фінальний handoff**
   - Підготувати короткий release-checklist з посиланнями на демо-артефакти та ризики.

## 7) Операційний чекліст для помилки `ERR_CONNECTION_REFUSED` на `46.119.236.29:5000`

1. **Перевірити, що API процес запущений на сервері**
   - `ss -ltnp | grep 5000` має показати listen на `0.0.0.0:5000` або `*:5000`.
2. **Перевірити локальний health endpoint на сервері**
   - `curl -f http://127.0.0.1:5000/health`.
3. **Перевірити зовнішній health endpoint з іншої машини**
   - `curl -f http://46.119.236.29:5000/health`.
4. **Перевірити правила firewall на сервері**
   - Відкрити TCP `5000` (API) і TCP `4200` (Angular dev server, якщо використовується саме dev-режим).
5. **Перевірити port-forwarding на роутері**
   - TCP `5000 -> 192.168.0.106:5000`.
   - TCP `4200 -> 192.168.0.106:4200`.
6. **Перевірити, що публічна IP не змінена провайдером**
   - Якщо IP динамічна, зафіксувати DDNS або статичну зовнішню IP.

## 8) Примітка щодо тестів

Тести можна запускати локально для self-check, але без додавання тимчасових тестових файлів у репозиторій.
