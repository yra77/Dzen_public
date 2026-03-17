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


### Швидкий bootstrap для internal npm mirror

```bash
cd src/Comments.Web
NPM_REGISTRY_URL=https://npm.example.local/repository/npm-group/ \
NPM_REGISTRY_TOKEN=<token_if_required> \
./scripts/bootstrap-npm-auth.sh
npm install
```

- Скрипт створює/оновлює локальний `src/Comments.Web/.npmrc` і прибирає ручні кроки для `npm test`/`npm run e2e:smoke` у закритих середовищах.
- Для шаблону конфіга можна використати `src/Comments.Web/.npmrc.internal-mirror.example`.

## Unit/Component тести

```bash
cd src/Comments.Web
npm test -- --watch=false
```

> Якщо середовище обмежує доступ до `registry.npmjs.org`, спочатку потрібно налаштувати internal npm mirror/proxy, інакше `karma`/`jasmine` залежності не встановляться.

## Browser smoke e2e (Playwright)

```bash
cd src/Comments.Web
npm run e2e:smoke
```

Налаштування:
- `playwright.config.ts` використовує `E2E_BASE_URL` (за замовчуванням `http://127.0.0.1:4200`);
- smoke-spec знаходиться у `e2e/smoke.spec.ts`;
- для стабільної перевірки thread-сценарію потрібен доступний root-коментар з `id=1` (seed/dev-дані).

> Якщо середовище блокує npm registry, встановлення `@playwright/test` буде недоступне до підключення internal npm mirror/proxy.

## Наступні кроки міграції

1. ✅ Розширено e2e до runtime create/reply з captcha і txt attachment-flow.
2. ✅ Додано e2e-перевірку realtime refresh (SignalR) між двома вкладками.
3. ✅ Додано GitHub Actions workflow `.github/workflows/comments-web-e2e-smoke.yml` для автозапуску Playwright smoke (піднімає backend + frontend та виконує `npm run e2e:smoke`).
