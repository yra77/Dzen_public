# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-16 (ітерація 5).

## Підсумок

- **Повністю виконано:** 30 пунктів.
- **Частково виконано:** 3 пункти.
- **Не виконано:** 4 пункти.

> Висновок: поточний стан ще не покриває **всі** вимоги ТЗ на 100%, але закрито критичний блок валідації `Text`.

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
| Каскадні (nested) відповіді довільної глибини | 🟨 | Вкладені відповіді є, але ліміт глибини = 10. |
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
- ✅ Для кожного root-коментаря додано окремий row із nested-thread (відповіді довільної структури в межах наявного `MaxThreadDepth=10`).
- ✅ Оновлено стилі SPA для табличного layout (`comments-table`, responsive wrapper, допоміжні стани для порожніх replies).
- ✅ Додано Lightbox/modal для image-вкладень у SPA (через `<dialog>`): відкриття з картки коментаря, закриття кнопкою та кліком по backdrop.
- ✅ Санітизація `Text`: замінено повний HTML-encode на whitelist-підхід тільки для тегів `a`, `code`, `i`, `strong`.
- ✅ XHTML-валидація: додано strict parsing (через `XDocument`) і відхилення невалідної/незакритої розмітки.
- ✅ Безпека атрибутів: для `<a>` дозволено тільки `href`, причому лише абсолютні `http/https` URL; для інших тегів атрибути заборонені.

- ✅ Додано клієнтський UX-паритет валідації `Text`: у SPA показуються структуровані помилки sanitizer/XHTML під textarea як для live preview, так і для submit (валідація тегів/атрибутів/`href`/закриття тегів).

### Що ще треба зробити

1. Реалізувати **Angular SPA** (заміна/доповнення vanilla JS).
2. Перейти на **MediatR + FluentValidation** у Application-шарі.
3. Розширити RabbitMQ-пайплайн до окремих задач `indexing`/`file-processing`.
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

## Що ще треба зробити у проєкті

1. 🔲 **Angular SPA (LTS) замість vanilla JS** — критичний невиконаний пункт ТЗ.
2. 🔲 **CQRS + MediatR + FluentValidation** — впровадити command/query pipeline та валідатори.
3. 🟨 **Довільна глибина вкладеності коментарів** — прибрати/переглянути ліміт `MaxThreadDepth=10` або узгодити як технічне обмеження.
4. 🟨 **RabbitMQ-консьюмери для `indexing`/`file-processing`** — черги і routing вже є, але відсутні окремі worker/consumer сервіси з retry/DLQ.
