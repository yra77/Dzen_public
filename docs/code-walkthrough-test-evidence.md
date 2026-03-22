# Dzen_public — test strategy & evidence для захисту

> Оновлено: 2026-03-22  
> Призначення: дати структуровану відповідь «які перевірки що доводять».

---

## 1) Що саме треба довести на захисті

1. **Функціональна коректність**: create/search/thread/preview працюють за вимогами.
2. **Надійність інтеграцій**: черги/індексація/realtime не ламають core flow.
3. **Стійкість до збоїв**: при падінні Elasticsearch система лишається працездатною.
4. **Цілісність даних**: duplicate delivery не створює повторної обробки.
5. **Безпека вводу**: captcha + sanitizer + attachment-policy знижують ризики.

---

## 2) Матриця «тип тесту -> що доводить -> артефакт»

| Тип перевірки | Що доводить | Який артефакт показати |
|---|---|---|
| Unit (Application handlers/validators) | Бізнес-правила й валідація працюють детерміновано | `dotnet test` по Application/Domain test-проєктах + приклади assert-ів |
| Integration (Infrastructure + DB) | Репозиторії/міграції/мапінги коректно працюють із реальною БД | Тести з test DB + лог успішного проходу |
| Integration (Messaging consumers) | Ідемпотентність через `ProcessedMessages`, коректний retry path | Тести consumer-ів і перевірка відсутності дубль-ефектів |
| API contract (REST/GraphQL) | Контракти відповіді та error mapping стабільні | Приклади запитів/респонсів (happy path + validation error) |
| E2E (UI -> API -> DB -> realtime) | Ключовий user-flow працює наскрізно | Демо сценарій + чекліст кроків з очікуваними результатами |
| Resilience checks | При недоступному ES пошук деградує на fallback, а не падає | Демо degraded mode + логи переключення |
| Operational checks | Сервіс готовий до запуску/моніторингу | `docker compose`, health/readiness, smoke-check список |

---

## 3) Мінімальний набір команд для демо перед комісією

> Адаптуй під фактичні скрипти репозиторію; нижче — шаблонний «кістяк».

1. Backend tests:  
   `dotnet test`
2. Frontend tests/lint (якщо налаштовано):  
   `npm run test` / `npm run lint`
3. Smoke запуск локального стенду:  
   `docker compose up -d`
4. Перевірка API endpoint + GraphQL:  
   `curl`/Postman collections
5. Resilience demo:  
   тимчасово вимкнути Elasticsearch, повторити search і показати fallback-поведінку.

---

## 4) Готовий «короткий текст» для відповіді про тестування (30–45 сек)

«Я покриваю систему трьома рівнями перевірок.  
Перший — unit-тести на use-case/валідацію, які доводять коректність бізнес-правил.  
Другий — integration-тести на persistence, messaging та API-контракти, щоб підтвердити правильну роботу інтеграцій.  
Третій — e2e/smoke-сценарії для критичного user-flow створення та пошуку коментарів.  
Окремо демонструю resilience: при недоступному Elasticsearch пошук переходить на fallback і система не втрачає базову функціональність.  
Таким чином тести підтверджують і функціональність, і надійність в реальних умовах.»

---

## 5) Що ще бажано додати після захисту

- [ ] Публічний `TESTING.md` з exact-командами та expected output.
- [ ] CI badge + summary по test suites (unit/integration/e2e).
- [ ] Автоматизований resilience test-сценарій (chaos-style для search backend).
- [ ] Шаблон one-page test report для релізного go/no-go.
