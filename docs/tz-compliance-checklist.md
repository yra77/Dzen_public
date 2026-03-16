# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-16 (ітерація 9).

## Підсумок

- **Повністю виконано:** 32 пункти.
- **Частково виконано:** 2 пункти.
- **Не виконано:** 3 пункти.

> Висновок: поточний стан ще не покриває **всі** вимоги ТЗ на 100%, але розширено performance-напрям (Middle+ k6 профіль + thresholds), залишились переважно архітектурні пункти.

## 1) Форма додавання коментаря

| Вимога ТЗ | Статус | Примітка |
|---|---|---|
| `UserName` обов'язковий, тільки латиниця + цифри | ✅ | Перевірка regex `^[a-zA-Z0-9]+$`. |
| `Email` обов'язковий і валідний | ✅ | Валідація `MailAddress.TryCreate`. |
| `HomePage` необов'язковий, валідний URL | ✅ | Перевірка абсолютного `http/https` URL. |
| CAPTCHA обов'язкова перевірка | ✅ | Є `BasicCaptchaValidator` + `RecaptchaCaptchaValidator`. |
| CAPTCHA як зображення + кеш/сесія 5 хв | ✅ | Є endpoint `GET /api/captcha/image`, challenge-кеш у `IMemoryCache`, TTL = 5 хв. |
| Текст із whitelist HTML-тегів (`a`, `code`, `i`, `strong`) | ✅ | Додано строгий whitelist тегів, інші теги блокуються помилкою. |
| Перевірка валідного XHTML (закриття тегів) | ✅ | Додано XML/XHTML-парсинг через `XDocument.Parse`; невалідна розмітка відхиляється. |
| Валідація і на клієнті, і на сервері | ✅ | Серверна валідація доповнена клієнтським UX-паритетом у SPA: preview і submit відображають структуровані помилки sanitizer/XHTML (`tag not allowed`, невалідний XHTML, некоректні атрибути/`href`). |

## 2) Файли/вкладення

| Вимога ТЗ | Статус | Примітка |
|---|---|---|
| Дозволені типи: JPG/GIF/PNG/TXT | ✅ | MIME-обмеження на API і SPA. |
| TXT до 100KB | ✅ | Серверна межа `Attachments:MaxTextSizeBytes=102400` + клієнтська перевірка у SPA. |
| Зображення до 320x240, інакше пропорційний resize | ✅ | Серверний auto-resize у `LocalAttachmentStorage` (`ResizeMode.Max`, 320x240). |
| Прев'ю вкладень до відправки | ✅ | Є прев'ю image і txt в UI. |
| Візуальні ефекти перегляду (Lightbox-подібно) | ✅ | Додано modal/lightbox на базі `<dialog>` для image-вкладень із відкриттям по кліку. |

## 3) Головна сторінка (SPA)

| Вимога ТЗ | Статус | Примітка |
|---|---|---|
| SPA без перезавантаження | ✅ | Fetch/AJAX-робота у `app.js`. |
| Каскадні (nested) відповіді довільної глибини | ✅ | Серверний ліміт `MaxThreadDepth=10` прибрано; для GraphQL у SPA додано поетапне довантаження гілок через `commentTree`, що знімає обмеження фіксованого selection depth. |
| Кореневі коментарі таблицею із сортуванням | ✅ | Додано табличний рендер root-коментарів (`<table>`), сортування працює через існуючі контроли. |
| Сортування за UserName/Email/Date ASC/DESC | ✅ | Підтримується REST і GraphQL. |
| Пагінація по 25 за замовчуванням | ✅ | `pageSize=25` за замовчуванням. |
| Дефолтне сортування LIFO (CreatedAt DESC) | ✅ | Виконується у сервісі та GraphQL defaults. |
| Кнопки швидких тегів `[i] [strong] [code] [a]` | ✅ | Додано toolbar у формі, вставка тегів у textarea. |
| Preview повідомлення без перезавантаження | ✅ | Live preview через серверний preview API (REST/GraphQL), без reload. |

## 4) API / інтеграції

| Вимога ТЗ | Статус | Примітка |
|---|---|---|
| REST API create/list | ✅ | Реалізовано. |
| GraphQL як основний API | 🟨 | GraphQL є, але REST також first-class; у UI перемикач режимів. |
| GraphQL операції `commentsPage`, `commentTree`, `addComment`, `addReply`, `previewComment` | ✅ | Додано окремі GraphQL операції `commentsPage`, `commentTree`, `addComment`, `addReply`, `previewComment` (збережено зворотну сумісність через `comments`/`createComment`). |
| RabbitMQ подія `comment.created` | ✅ | Реалізовано опційно через конфіг. |
| Черги `indexing` і `file-processing` | ✅ | Додано декларацію 2 черг у RabbitMQ, bind до `comments.events` та публікацію окремих routing key (`comment.created.indexing`, `comment.created.file-processing`). |
| Elasticsearch індексація/пошук | ✅ | Індексування при створенні + пошук + backfill. |
| SignalR real-time події нових коментарів | ✅ | Hub `/hubs/comments`, подія `commentCreated`. |

## 5) Архітектура / стек / поставка

| Вимога ТЗ | Статус | Примітка |
|---|---|---|
| ASP.NET Core 8/9 | ✅ | Проєкт на .NET 8. |
| MSSQL + EF Core | ✅ | Є SqlServer конфіг + EF репозиторій. |
| Clean Architecture / SOLID / OOP | 🟨 | Шари відокремлені, але CQRS+MediatR не впроваджено повністю. |
| CQRS + MediatR + FluentValidation | ❌ | MediatR/FluentValidation пакети та pipeline-и відсутні. |
| Angular SPA (LTS) | ❌ | Angular-клієнт не створений, лише vanilla JS SPA. |
| Docker Compose (app, db, rabbitmq, elasticsearch) | ✅ | Наявний `docker-compose.yml`. |
| README + схема БД | ✅ | README і `db-schema.mwb` присутні. |
| Відео-демо | ❌ | У репозиторії не знайдено. |

## 6) Навантажувальне тестування

| Вимога ТЗ | Статус | Примітка |
|---|---|---|
| Наявність сценарію load test (k6/JMeter) | ✅ | Є `load-test/comments-smoke.js` (smoke). |
| Цільовий сценарій масштабу Middle+ (100k users / 1M messages / 24h) | ❌ | Поточний smoke-сценарій значно менший (5 VU, 15s). |

## Першочергові кроки до 100% відповідності

### Внесено в цій ітерації

- ✅ Перероблено рендер головного списку: кореневі коментарі тепер відображаються таблицею (`<table>`) з колонками `UserName/Email/HomePage/Date/Text/Actions`.
- ✅ Для кожного root-коментаря додано окремий row із nested-thread (відповіді довільної структури без штучного ліміту глибини на сервері).
- ✅ Оновлено стилі SPA для табличного layout (`comments-table`, responsive wrapper, допоміжні стани для порожніх replies).
- ✅ Додано Lightbox/modal для image-вкладень у SPA (через `<dialog>`): відкриття з картки коментаря, закриття кнопкою та кліком по backdrop.
- ✅ Санітизація `Text`: замінено повний HTML-encode на whitelist-підхід тільки для тегів `a`, `code`, `i`, `strong`.
- ✅ XHTML-валидація: додано strict parsing (через `XDocument`) і відхилення невалідної/незакритої розмітки.
- ✅ Безпека атрибутів: для `<a>` дозволено тільки `href`, причому лише абсолютні `http/https` URL; для інших тегів атрибути заборонені.

- ✅ Додано клієнтський UX-паритет валідації `Text`: у SPA показуються структуровані помилки sanitizer/XHTML під textarea як для live preview, так і для submit (валідація тегів/атрибутів/`href`/закриття тегів).

- ✅ Прибрано серверне обмеження глибини гілки коментарів (`MaxThreadDepth=10`) у `CommentService`; тепер створення reply не блокується фіксованим лімітом рівнів.
- ✅ Підвищено глибину вибірки nested-відповідей у GraphQL SPA-клієнті (`MAX_GRAPHQL_THREAD_DEPTH`) з 10 до 25 для кращого покриття глибоких дерев у режимі GraphQL.

- ✅ Додано поетапну стратегію для GraphQL nested-дерева в SPA: кнопка «Довантажити гілку» викликає `commentTree(rootCommentId, ...)` і замінює вибраний вузол у локальному дереві без повного перезавантаження сторінки.
- ✅ Оптимізовано UI-дії collapse/expand: перемальовування виконується з локального стану `currentItems` без повторного мережевого запиту.

### Що ще треба зробити

1. Реалізувати **Angular SPA** (заміна/доповнення vanilla JS).
2. Перейти на **MediatR + FluentValidation** у Application-шарі.
3. Додати production-hardening для RabbitMQ (персистентне сховище ідемпотентності, delayed retry/backoff, окремі retry-черги, алерти/метрики).
4. Розширити load-test до вимог Middle+ і зафіксувати метрики.
5. Додати відео-демо у README.


## Останні внесені зміни

- ✅ Додано сервісний метод `GetThreadAsync(...)` для отримання дерева конкретної гілки коментарів за `rootCommentId`.
- ✅ У GraphQL додано окремі операції:
  - query `commentsPage` (окремо від legacy `comments`),
  - query `commentTree(rootCommentId, ...)`,
  - mutation `addComment`,
  - mutation `addReply`,
  - mutation `createComment` залишена як alias для сумісності.
- ✅ Оновлено статус відповідності ТЗ для блоку GraphQL-операцій.

- ✅ RabbitMQ-публікацію розширено для задачних черг: додано `indexing` і `file-processing` (declare/bind/publish) з окремими routing keys; `file-processing` подія відправляється лише коли коментар має вкладення.

- ✅ Додано базовий hosted worker `RabbitMqTaskQueuesConsumerHostedService` для черг `indexing` і `file-processing` (підписка, ack/nack, логування обробки повідомлень).
- ✅ Додано конфіг `RabbitMq:ConsumerEnabled` для керування запуском consumer-воркерів.

- ✅ Для RabbitMQ worker-ів додано надійність обробки: автоматичні повторні спроби з лічильником `x-retry-count`, обмеження `MaxRetryCount`, DLX/DLQ маршрутизація після вичерпання retry.
- ✅ Додано базову ідемпотентність у consumer-ах: дублікати повідомлень з однаковим `MessageId` пропускаються з `ack`.
- ✅ Publisher тепер заповнює `MessageId`, `ContentType` і службові headers для retry-пайплайну.

## Що ще треба зробити у проєкті

1. 🔲 **Angular SPA (LTS) замість vanilla JS** — критичний невиконаний пункт ТЗ.
2. 🔲 **CQRS + MediatR + FluentValidation** — впровадити command/query pipeline та валідатори.
3. ✅ **Надійність RabbitMQ workers (`indexing`/`file-processing`)** — додано retry policy через `x-retry-count`, DLX/DLQ для задачних черг та базову ідемпотентність по `MessageId` у consumer-воркері.
4. ✅ **GraphQL nested-вибірка у SPA для дуже глибоких дерев** — додано кероване довантаження окремих гілок (`commentTree`) у UI-кнопці «Довантажити гілку», що прибирає залежність від одного фіксованого selection set.


## Оновлення ітерації 9

- ✅ Додано розширений сценарій навантажувального тестування `load-test/comments-middle.js` (мікс REST/GraphQL, create/list/search, кілька сценаріїв k6, SLA-thresholds p95/p99, окремі метрики `create/list/search/graphql`).
- ✅ README доповнено інструкцією запуску smoke та Middle+-сценарію (`k6 run ...`, `API_MODE`, `CAPTCHA_TOKEN`).
- 🟨 Пункт ТЗ «розширити load-test до Middle+ і зафіксувати метрики» переведено в **частково виконано**: сценарій та пороги вже є в репозиторії, але ще треба виконати прогін у цільовому середовищі й додати зафіксований звіт/артефакти метрик.

### Що ще треба зробити після ітерації 9

1. 🔲 **Angular SPA (LTS) замість vanilla JS** — виконати міграцію UI з перенесенням поточної функціональності (nested tree, preview, SignalR, lightbox).
2. 🔲 **CQRS + MediatR + FluentValidation** — виділити command/query handlers, валідатори та pipeline behavior.
3. 🔲 **Production-hardening RabbitMQ** — винести ідемпотентність у персистентне сховище, додати delayed retry/backoff policy, runtime-метрики та алерти.
4. 🟨 **Load-test Middle+ (фіналізація)** — запустити `comments-middle.js` у середовищі з увімкненим RabbitMQ/Elasticsearch, зберегти результати (summary/JSON, p95/p99, error-rate) у `docs/` і додати посилання в README.
5. 🔲 **Відео-демо в README** — записати і додати посилання/розділ «Demo».
