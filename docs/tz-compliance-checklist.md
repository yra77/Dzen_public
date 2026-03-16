# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-16.

## Підсумок

- **Повністю виконано:** 14 пунктів.
- **Частково виконано:** 6 пунктів.
- **Не виконано:** 7 пунктів.

> Висновок: поточний стан не покриває **всі** вимоги ТЗ на 100%.

## 1) Форма додавання коментаря

| Вимога ТЗ | Статус | Примітка |
|---|---|---|
| `UserName` обов'язковий, тільки латиниця + цифри | ✅ | Перевірка regex `^[a-zA-Z0-9]+$`. |
| `Email` обов'язковий і валідний | ✅ | Валідація `MailAddress.TryCreate`. |
| `HomePage` необов'язковий, валідний URL | ✅ | Перевірка абсолютного `http/https` URL. |
| CAPTCHA обов'язкова перевірка | ✅ | Є `BasicCaptchaValidator` + `RecaptchaCaptchaValidator`. |
| CAPTCHA як зображення + кеш/сесія 5 хв | ❌ | Генерація captcha-зображення відсутня. |
| Текст із whitelist HTML-тегів (`a`, `code`, `i`, `strong`) | ❌ | Наразі повний HTML-encode без whitelist. |
| Перевірка валідного XHTML (закриття тегів) | ❌ | Спеціальної XHTML-валидації немає. |
| Валідація і на клієнті, і на сервері | 🟨 | Базова клієнтська є, але без повного паритету правил з сервером. |

## 2) Файли/вкладення

| Вимога ТЗ | Статус | Примітка |
|---|---|---|
| Дозволені типи: JPG/GIF/PNG/TXT | ✅ | MIME-обмеження на API і SPA. |
| TXT до 100KB | ❌ | Використовується єдина межа 1MB. |
| Зображення до 320x240, інакше пропорційний resize | ❌ | Resize/перевірка пікселів не реалізовані. |
| Прев'ю вкладень до відправки | ✅ | Є прев'ю image і txt в UI. |
| Візуальні ефекти перегляду (Lightbox-подібно) | ❌ | Відкриття посиланням у новій вкладці, без modal/lightbox. |

## 3) Головна сторінка (SPA)

| Вимога ТЗ | Статус | Примітка |
|---|---|---|
| SPA без перезавантаження | ✅ | Fetch/AJAX-робота у `app.js`. |
| Каскадні (nested) відповіді довільної глибини | 🟨 | Вкладені відповіді є, але ліміт глибини = 10. |
| Кореневі коментарі таблицею із сортуванням | 🟨 | Сортування є, але рендер картками, не table markup. |
| Сортування за UserName/Email/Date ASC/DESC | ✅ | Підтримується REST і GraphQL. |
| Пагінація по 25 за замовчуванням | ✅ | `pageSize=25` за замовчуванням. |
| Дефолтне сортування LIFO (CreatedAt DESC) | ✅ | Виконується у сервісі та GraphQL defaults. |
| Кнопки швидких тегів `[i] [strong] [code] [a]` | ❌ | Панелі кнопок у формі немає. |
| Preview повідомлення без перезавантаження | ❌ | Окремого endpoint/режиму preview тексту немає. |

## 4) API / інтеграції

| Вимога ТЗ | Статус | Примітка |
|---|---|---|
| REST API create/list | ✅ | Реалізовано. |
| GraphQL як основний API | 🟨 | GraphQL є, але REST також перший клас; у UI перемикач режимів. |
| GraphQL операції `commentsPage`, `commentTree`, `addComment`, `addReply`, `previewComment` | ❌ | Є `comments`, `searchComments`, `createComment`; решта не виділені окремо. |
| RabbitMQ подія `comment.created` | ✅ | Реалізовано опційно через конфіг. |
| Черги `indexing` і `file-processing` | ❌ | Публікується в `comments` exchange routing key `comment.created`; окремих черг логікою застосунку немає. |
| Elasticsearch індексація/пошук | ✅ | Індексування при створенні + пошук + backfill. |
| SignalR real-time події нових коментарів | ✅ | Hub `/hubs/comments`, подія `commentCreated`. |

## 5) Архітектура / стек / поставка

| Вимога ТЗ | Статус | Примітка |
|---|---|---|
| ASP.NET Core 8/9 | ✅ | Проєкт на .NET 8. |
| MSSQL + EF Core | ✅ | Є SqlServer конфіг + EF репозиторій. |
| Clean Architecture / SOLID / OOP | 🟨 | Шари відокремлені, але CQRS+MediatR не впроваджено повністю. |
| CQRS + MediatR + FluentValidation | ❌ | MediatR/FluentValidation пакети та пайплайни відсутні. |
| Angular SPA (LTS) | ❌ | Angular клієнт не створений, лише vanilla JS SPA. |
| Docker Compose (app, db, rabbitmq, elasticsearch) | ✅ | Наявний `docker-compose.yml`. |
| README + схема БД | ✅ | README і `db-schema.mwb` присутні. |
| Відео-демо | ❌ | У репозиторії не знайдено. |

## 6) Навантажувальне тестування

| Вимога ТЗ | Статус | Примітка |
|---|---|---|
| Наявність сценарію load test (k6/JMeter) | ✅ | Є `load-test/comments-smoke.js` (smoke). |
| Цільовий сценарій масштабу Middle+ (100k users / 1M messages / 24h) | ❌ | Поточний smoke-сценарій значно менший (5 VU, 15s). |

## Першочергові кроки до 100% відповідності

1. Реалізувати **Angular SPA** (заміна/доповнення vanilla JS).
2. Додати **whitelist HTML sanitizer + XHTML validator** для `Text`.
3. Додати **captcha-image endpoint** (генерація + TTL 5 хв у кеші).
4. Допрацювати вкладення: **TXT ≤ 100KB**, **resize до 320x240** для image.
5. Додати **previewComment** API (GraphQL mutation/query) і UI preview блоку.
6. Додати toolbar кнопки `[i] [strong] [code] [a]`.
7. Перейти на **MediatR + FluentValidation** у Application шарі.
8. Розширити RabbitMQ-пайплайн до окремих задач `indexing`/`file-processing`.
9. Розширити load-test до вимог Middle+ і зафіксувати метрики.
10. Додати відео-демо у README.
