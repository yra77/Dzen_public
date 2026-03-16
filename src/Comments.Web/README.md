# Comments.Web (Angular LTS scaffold)

У цій ітерації додано базовий Angular standalone-shell з маршрутизацією:
- `/` — сторінка списку root-коментарів з читанням `GET /api/comments`;
- `/thread/:id` — заготовка сторінки гілки коментаря.

## Запуск локально

> Через обмеження доступу до npm registry в частині середовищ може знадобитися локальний mirror/npm proxy.

```bash
cd src/Comments.Web
npm install
npm start
```

За замовчуванням API очікується на `http://localhost:5000` (див. `src/environments/environment.ts`).

## Наступні кроки міграції

1. Перенести форму create/reply + preview.
2. Підключити captcha image challenge та attachments preview.
3. Додати SignalR live updates.
4. Додати e2e smoke для create + reply + realtime.
