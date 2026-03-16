# Comments.Web (Angular LTS scaffold)

У поточній ітерації Angular-клієнт уже має базові робочі сценарії:
- `/` — сторінка списку root-коментарів з читанням `GET /api/comments`;
- `/thread/:id` — сторінка гілки, що завантажує `GET /api/comments/{rootId}/thread`;
- reply-flow на thread-сторінці: форма (user/email/text), `GET /api/captcha/image`, submit через `POST /api/comments`.

## Запуск локально

> Через обмеження доступу до npm registry в частині середовищ може знадобитися локальний mirror/npm proxy.

```bash
cd src/Comments.Web
npm install
npm start
```

За замовчуванням API очікується на `http://localhost:5000` (див. `src/environments/environment.ts`).

## Наступні кроки міграції

1. Додати preview тексту перед submit (REST/GraphQL parity).
2. Підключити attachments upload/preview.
3. Додати SignalR live updates.
4. Додати e2e smoke для create + reply + realtime.
