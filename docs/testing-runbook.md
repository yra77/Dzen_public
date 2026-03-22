# Testing runbook (локально + evidence для захисту)

> Ціль: мати відтворюваний набір перевірок і артефактів, щоб на захисті говорити фактами.

---

## 1) Принципи цього runbook

- Фіксуємо не лише «що запускали», а і **очікування** та **факт**.
- Для кожної критичної перевірки додаємо короткий артефакт:
  - stdout-лог,
  - скрін/запис консолі,
  - timestamp.
- Уникаємо «все зелене, повірте на слово».

---

## 2) Мінімальний набір перевірок перед захистом

### 2.1 Backend quality gate

1. Restore/build:
   - `dotnet restore`
   - `dotnet build -c Release`

2. Тести:
   - `dotnet test -c Release`

3. Локальний health-check:
   - запустити API;
   - `curl -f http://localhost:5000/health` (порт/URL під ваш env).

### 2.2 Frontend quality gate

1. Install:
   - `npm ci`

2. Lint/tests/build:
   - `npm run lint`
   - `npm test -- --watch=false`
   - `npm run build`

### 2.3 E2E/інтеграційний smoke

- Створити коментар через UI/GraphQL.
- Переконатися, що запис з’явився у списку/гілці.
- Перевірити realtime-оновлення у другій вкладці.
- Перевірити пошук (happy path).
- Перевірити degraded search mode (коли ES недоступний).

---

## 3) Матриця evidence (шаблон)

| Перевірка | Команда/дія | Очікування | Факт | Артефакт |
|---|---|---|---|---|
| Backend build | `dotnet build -c Release` | Збірка успішна | PASS/FAIL | log + timestamp |
| Backend tests | `dotnet test -c Release` | Усі тести проходять | PASS/FAIL | log + timestamp |
| Frontend lint | `npm run lint` | Без критичних помилок | PASS/FAIL | log + timestamp |
| Frontend build | `npm run build` | Прод-збірка успішна | PASS/FAIL | log + timestamp |
| Health endpoint | `curl /health` | Сервіс healthy | PASS/FAIL | response snippet |
| Realtime smoke | 2 вкладки, новий коментар | Подія доходить миттєво | PASS/FAIL | коротке відео/скрін |
| Search degraded | Вимкнений ES | Fallback працює | PASS/FAIL | log + API response |

---

## 4) Go/No-Go правило

**Go**, якщо:
- усі критичні build/test/check пункти пройдені;
- обидва демо-кейси (degraded search + validation UX) відтворюються;
- evidence-матриця заповнена щонайменше по 6 ключових пунктах.

**No-Go**, якщо:
- є падіння у build/test, яке неможливо пояснити середовищем;
- demo нестабільне або не відтворюється 2 рази поспіль;
- немає артефактів, які підтверджують заяви.

---

## 5) Short script для усного захисту (30–40 с)

«Перед захистом ми проганяємо стандартизований runbook: build, unit/integration checks, health endpoint, realtime smoke та degraded search сценарій. Для кожного кроку фіксуємо evidence з timestamp. Тому на питання про стабільність системи відповідаємо не загальними словами, а перевірками, що відтворюються.»
