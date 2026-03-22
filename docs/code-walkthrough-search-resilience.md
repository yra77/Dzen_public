# Code Walkthrough: Search + Resilience (E2E сценарій для захисту)

> Оновлено: 2026-03-22  
> Ціль: мати готову розповідь про пошук коментарів і поведінку системи у degraded mode, коли Elasticsearch недоступний.

---

## 1) Коротка версія (30–60 секунд)

1. Користувач вводить пошуковий запит у SPA (root list / toolbar).
2. Frontend відправляє GraphQL query (або REST read-endpoint, залежно від екрана).
3. API делегує запит у MediatR `SearchCommentsQuery`.
4. `SearchCommentsQueryHandler` викликає `ICommentSearchService`.
5. `ResilientCommentSearchService` спочатку пробує Elasticsearch-реалізацію.
6. Якщо ES недоступний або таймаутиться — спрацьовує fallback на `RepositoryCommentSearchService` (БД/репозиторій).
7. UI отримує результат у однаковому DTO-контракті, тому не ламає рендер незалежно від джерела пошуку.

---

## 2) Детальний сценарій по шарах

## Крок A. Frontend: підготовка фільтрів і запуск пошуку

- Користувач задає `query`, пагінацію (`page`, `pageSize`) та, за потреби, сортування.
- Фасад/stream (`comment-query-state`) дебаунсить введення і скасовує застарілі запити (`switchMap`), щоб не було гонок відповіді.
- API-wrapper формує GraphQL payload і передає його в `Comments.Api`.

**Що сказати на захисті:**
- «На фронті ми оптимізуємо UX (debounce/cancel), але джерело істини для релевантності — бекенд-пошук».

## Крок B. API: тонкий транспортний шар

- GraphQL resolver/REST endpoint створює `SearchCommentsQuery`.
- Через MediatR запит іде в `SearchCommentsQueryHandler`.
- `ValidationBehavior<,>` перевіряє базові інваріанти (порожній/занадто довгий query, валідна пагінація).

**Що сказати на захисті:**
- «API не реалізує пошук самостійно — лише маршрутизує запит у Application use-case».

## Крок C. Application: orchestration пошукового use-case

- `SearchCommentsQueryHandler` викликає абстракцію `ICommentSearchService`.
- Для handler-а неважливо, ES це чи БД: він працює з єдиним контрактом результату (`items`, `totalCount`, `page`, `pageSize`).
- Мапить результат у DTO, яке стабільне для фронта.

**Архітектурний акцент:**
- DIP у чистому вигляді: use-case залежить від абстракції, а не від ES SDK/EF.

## Крок D. Infrastructure: primary path + fallback

### Primary path (happy)

- `ElasticsearchCommentSearchService` виконує full-text запит по індексу.
- Повертає релевантні документи з урахуванням пагінації/ранжування.

### Fallback path (degraded)

- `ResilientCommentSearchService` обгортає primary search.
- Якщо ES кидає transport/timeout/availability помилки, сервіс:
  1. логгує інцидент;
  2. переключає виконання на `RepositoryCommentSearchService`;
  3. повертає той самий тип результату, але з БД-джерела.

**Що важливо проговорити:**
- Це не «тихий провал»: система свідомо переходить у degraded mode, щоб зберегти працездатність фічі.
- Точність/релевантність у fallback може бути простішою, але користувач не втрачає функцію пошуку повністю.

## Крок E. UI: відображення результату незалежно від джерела

- Для компонентів root/thread неважливо, звідки прийшов список (ES чи repository fallback).
- UI отримує стандартний payload, оновлює state і показує результати/порожній стан/помилку в уніфікованому форматі.
- При відновленні ES наступні запити автоматично повертаються в happy path без змін у фронті.

---

## 3) Що це демонструє з погляду reliability

- **Graceful degradation:** функція пошуку працює навіть при частковому падінні інфраструктури.
- **Low coupling:** Application-шар не прив’язаний до ES-клієнта.
- **Operational visibility:** fallback супроводжується логуванням, тому інцидент видно в моніторингу.

---

## 4) Типові питання на захисті + короткі відповіді

### П: «Навіщо fallback, чому не повертати 500?»
**В:** Пошук — користувацька функція, яку краще деградувати, ніж вимикати. Fallback зберігає безперервність роботи при відмові ES.

### П: «Чи однакові результати ES і fallback?»
**В:** Не завжди. ES дає кращий full-text ranking, fallback зазвичай простіший. Але контракт відповіді і UX-потік залишаються стабільними.

### П: «Як зрозуміти, що система зараз у degraded mode?»
**В:** Через structured logs/метрики: `ResilientCommentSearchService` фіксує switch на repository-search.

### П: «Що з eventual consistency між БД і ES?»
**В:** Після create/update індекс може оновитись не миттєво. Саме тому fallback на БД також допомагає пом’якшити короткі вікна неузгодженості.

---

## 5) Міні-шпаргалка для усної презентації (2–3 хв)

1. «Пошук іде через `SearchCommentsQuery` у MediatR handler».  
2. «Handler викликає `ICommentSearchService`, не знаючи про конкретне сховище».  
3. «Primary — Elasticsearch для релевантного full-text».  
4. «При збої ES `ResilientCommentSearchService` робить fallback на БД».  
5. «Фронт отримує той самий DTO-контракт, тому UX стабільний».  
6. «Це приклад reliability-by-design: graceful degradation замість hard fail».  
