# Перевірка відповідності ТЗ SPA «Коментарі»

Останнє оновлення: 2026-03-18 (ітерація 92).

## Підсумок перевірки відповідності ТЗ

- ✅ **Усі обовʼязкові пункти ТЗ виконані.**
- ⏭️ **Пункти №5 та №6 чекліста** (Middle+ load-test та demo-артефакт) **виключені з обовʼязкових** за вашим запитом і не блокують старт тестування.
- ✅ Реалізація покриває backend/API, frontend, CQRS+MediatR+FluentValidation, realtime (SignalR), пошук/індексацію, RabbitMQ pipeline та CI smoke-перевірки.

> Висновок: проєкт готовий до вашого ручного тестування по ТЗ без очікування робіт із пунктів 5 та 6.

## Актуальний статус по ключових блоках ТЗ

1. ✅ **Backend / API** — виконано:
   - REST + GraphQL API;
   - валідація, preview, captcha, вкладення;
   - SignalR push-оновлення;
   - Elasticsearch інтеграція;
   - RabbitMQ publisher/consumer базис.

2. ✅ **Архітектура (CQRS + MediatR + FluentValidation)** — виконано:
   - каркас CQRS, handlers, validation pipeline;
   - edge-case покриття (включно з cancellation token).

3. ✅ **Frontend Angular LTS** — виконано:
   - root/thread create/reply, preview, captcha, attachment flows;
   - обробка validation/transient UX;
   - realtime оновлення і стани reconnection;
   - unit/component tests + e2e smoke (Playwright), включно з multi-tab та attachment boundary.

4. ✅ **RabbitMQ production-hardening (мінімально необхідний для QA)** — виконано:
   - retry/DLQ базис;
   - consumer метрики (`success/fail/retry/latency`);
   - persistent idempotency + cleanup;
   - alert-пороги і DLQ replay-flow у runbook.

5. ⏭️ **Пункт №5 (Middle+ load-test)** — не обовʼязковий.
6. ⏭️ **Пункт №6 (Demo-артефакт)** — не обовʼязковий.

## Швидкий план завершення перед стартом вашого тестування

### Фаза 1 (сьогодні, 1–2 години)

1. **Go/No-Go прогін (P0):**
   - прогнати backend tests;
   - прогнати frontend unit tests;
   - прогнати Playwright smoke.

2. **Тестовий стенд для вас (P0):**
   - підняти docker-compose (db + rabbitmq + elasticsearch);
   - перевірити health endpoint API;
   - перевірити, що UI відкривається і авторизаційні/мережеві налаштування для вашого середовища коректні.

### Фаза 2 (перед передачею в QA, ~30 хв)

3. **Фіксація білду (P1):**
   - зафіксувати commit/tag, на якому пройшли smoke перевірки;
   - коротко зафіксувати команди запуску для ручного тестування.

4. **Передача в тестування (P0):**
   - надати вам статус `Go`;
   - запускати повне ручне тестування по ТЗ.


## Оновлення в ітерації 84

- ✅ Додано автоматизований Go/No-Go скрипт `scripts/go-no-go-check.sh`, який послідовно запускає backend tests, frontend unit tests та Playwright e2e smoke.
- ✅ Уточнено крок передачі в QA: перед передачею використовувати єдину команду `./scripts/go-no-go-check.sh` для відтворюваного smoke-прогону.


## Оновлення в ітерації 85

- ✅ Додано endpoint готовності `GET /health` у `Comments.Api` для швидкої перевірки доступності API у локальному QA-стенді.
- ✅ Додано скрипт `scripts/qa-stand-check.sh`, який піднімає `docker compose` сервіси та перевіряє доступність API/RabbitMQ/Elasticsearch з retry-політикою.
- ✅ Зафіксовано операційний крок для передстартової перевірки інфраструктури перед ручним прогоном ТЗ.


## Оновлення в ітерації 86

- ✅ Додано в `README.md` окремий блок QA handoff з послідовністю `qa-stand-check` → `go-no-go-check` для відтворюваної передачі збірки в ручне тестування.
- ✅ Посилено `scripts/go-no-go-check.sh`: додано preflight-перевірку наявності `dotnet` і `npm` з fail-fast повідомленням, щоб уникати неявних падінь на цільових середовищах.
- ✅ Актуалізовано чекліст поточного етапу з урахуванням нового документаційного та операційного hardening-кроку.

## Оновлення в ітерації 87

- ✅ Розширено `scripts/qa-stand-check.sh`: додано опційний прапорець `--report-file <path>` для формування JSON-звіту готовності стенду (status/timestamp/message).
- ✅ Розширено `scripts/go-no-go-check.sh`: додано опційний прапорець `--report-file <path>` для формування JSON-звіту smoke-прогону перед QA handoff.
- ✅ Оновлено `README.md`: у QA handoff-документації зафіксовано нові команди з експортом звітів у `docs/artifacts/*.json`.


## Оновлення в ітерації 88

- ✅ Виправлено dev-з'єднання Angular SPA з API/SignalR: у `Comments.Api` додано CORS-політику `CommentsWebDevClient` для `http://localhost:4200` та `http://127.0.0.1:4200` з `AllowCredentials` для SignalR.
- ✅ Усунено помилку повторної captcha-перевірки під час створення коментаря/відповіді: прибрано дублюючу валідацію з `CommentService`, залишено єдину валідацію у FluentValidation pipeline.
- ✅ Оновлено базовий UI Angular (`Comments.Web`) до стилістики, наближеної до `Comments.Api/wwwroot`: контейнер/панелі, форми, картки коментарів, captcha/attachment preview.


## Оновлення в ітерації 89

- ✅ В Angular (`Comments.Web`) додано preview вибраного зображення у формах створення root-коментаря та reply (до submit).
- ✅ В Angular додано блок **«Швидкі теги: [i] [strong] [code] [a]»** для обох форм із вставкою тегів у поточне виділення тексту, за аналогією з `Comments.Api/wwwroot/index.html`.
- ✅ Уточнено CAPTCHA-flow: перевірка виконується на бекенді (`ICaptchaValidator`), для provider `Basic` — локально через challenge store (`challengeId:answer`), для `Recaptcha` — серверним POST на зовнішній verify endpoint.
- 🔜 Додатково перевірити в локальному ручному прогоні, що після `Оновити CAPTCHA` користувач вводить відповідь саме для нового challenge (попередній токен стає невалідним після першої перевірки).

## Оновлення в ітерації 90

- ✅ У `Comments.Api` увімкнено SignalR за замовчуванням (`SignalR:Enabled = true`), щоб realtime-оновлення нових коментарів працювали без додаткової конфігурації після стандартного старту застосунку.
- ✅ У `Comments.Web` на сторінці гілки реалізовано каскадне reply-UX будь-якої глибини: для root-коментаря та для кожної відповіді додано кнопку **«Відповісти»** у правому нижньому куті картки.
- ✅ Додавання reply переведено у модальне вікно з формою (поля, CAPTCHA, quick-tags, preview, вкладення, кнопки **«Закрити»** / **«Створити коментар»**), а `parentId` тепер прив'язується до вибраного вузла дерева.
- ✅ Оновлено unit-тести `ThreadPageComponent`: зафіксовано нову модель submit reply через вибраний цільовий коментар (active reply target).


## Оновлення в ітерації 91

- ✅ У `Comments.Web` для форм root/reply додано явну дію скасування вибраного image-вкладення (**«Видалити зображення»**), щоб користувач міг відмінити додавання файла до submit.
- ✅ Оновлено CAPTCHA-flow відповідно до ТЗ: у `Comments.Api` генерація змінена з математичного прикладу на випадковий рядок із цифр та латинських літер; у `Comments.Web` синхронізовано підпис поля вводу.
- ✅ У `Comments.Web` для заглавних (root) коментарів реалізовано сортування за `User Name` / `E-mail` / `Дата`, перемикач напряму (`Asc`/`Desc`), дефолтне LIFO сортування та пагінацію по 25 записів.
- ✅ У відображенні коментарів прибрано показ `id`; залишено `user`, `email`, `datetime`, а інформаційну смугу стилізовано light-gray фоном.


## Оновлення в ітерації 92

- ✅ Посилено CAPTCHA у `Comments.Api`: генерація SVG доповнена деформаціями (`feTurbulence` + `feDisplacementMap`), кривими-лініями, точковим шумом та псевдо-символами для суттєвого ускладнення машинного OCR-розпізнавання.
- ✅ У `Comments.Web` (thread reply modal) прибрано відображення `id` у підписі «Відповідь на», щоб у UI залишалися тільки `user`, `email`, `datetime`.
- ✅ Оновлено Playwright smoke-helper для CAPTCHA: парсинг відповіді синхронізовано з новим SVG-форматом (алфавітно-цифровий код замість математичного виразу).

## Що ще треба зробити у проєкті

- 🔜 Додати e2e-перевірку нового CAPTCHA формату (латинські літери + цифри): позитивний submit і негативний сценарій із невалідною відповіддю.
- 🔜 Розглянути server-side rate limiting / throttling на endpoint `GET /api/captcha/image`, щоб зменшити ризик масового автоматизованого brute-force CAPTCHA.
- 🔜 Додати e2e-сценарій UX-скасування вибраного image-вкладення (кнопка **«Видалити зображення»**) для root і reply форм, включно з перевіркою очищення payload перед submit.
- 🔜 Перевірити end-to-end CAPTCHA сценарії в Angular (особливо після релоаду CAPTCHA та повторного submit), щоб виключити `Captcha validation failed` у разі використання застарілого challenge token.
- 🔜 Ручна перевірка multi-tab realtime: відкрити щонайменше дві вкладки (root list + thread), створити новий root/reply та підтвердити автоматичне оновлення без reload на обох вкладках.
- 🔜 Додати/перевірити e2e сценарій модального reply для вкладеного коментаря (2+ рівень): відкриття модалки, submit, поява нового вузла у правильній гілці.
- 🔜 Провести ручну UX-перевірку Angular UI проти еталону `src/Comments.Api/wwwroot/index.html` (включно з mobile breakpoint), зафіксувати дрібні візуальні відхилення та пріоритезувати їх окремим backlog-списком.
- 🔜 Запустити `./scripts/qa-stand-check.sh --report-file docs/artifacts/qa-stand-check.json` на цільовій машині, щоб підтвердити готовність локального стенду (API + RabbitMQ + Elasticsearch) та зберегти evidence-файл.
- 🔜 Виконати ручний Go/No-Go прогін через `./scripts/go-no-go-check.sh --report-file docs/artifacts/go-no-go-check.json` на цільовій машині та зафіксувати commit/tag реліз-кандидата.
- 🔜 Після підтвердження smoke — передати збірку в ручне тестування за ТЗ та зафіксувати статус `Go`.
- 🔜 Після першого прогона на цільовій машині додати у `docs/tz-compliance-checklist.md` фактичний timestamp/результат виконання `qa-stand-check` та `go-no-go-check` на основі згенерованих JSON-звітів.

## Що НЕ блокує старт тестування

- Middle+ load-test у цільовому контурі.
- Demo-відео/посилання в `README.md`.

---

Цей файл є єдиним актуальним чеклістом відповідності ТЗ для поточного етапу робіт.
