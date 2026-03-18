import { expect, test, type Page } from '@playwright/test';

/**
 * 1x1 PNG для smoke-сценаріїв перевірки image-вкладень.
 */
const tinyPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z9S8AAAAASUVORK5CYII=',
  'base64'
);

/**
 * Витягує captcha-код із SVG data-url для smoke-прогону.
 */
function resolveCaptchaAnswerFromDataUrl(captchaDataUrl: string): string {
  const base64Prefix = 'base64,';
  const base64Index = captchaDataUrl.indexOf(base64Prefix);
  if (base64Index < 0) {
    throw new Error('Captcha data-url не містить base64 payload.');
  }

  const payload = captchaDataUrl.slice(base64Index + base64Prefix.length);
  const svgMarkup = Buffer.from(payload, 'base64').toString('utf8');
  const weightedChars = [...svgMarkup.matchAll(/font-weight="700"[^>]*>([A-Z0-9])<\/text>/g)].map((match) => match[1]);

  if (weightedChars.length > 0) {
    return weightedChars.join('');
  }

  const fallback = svgMarkup.replace(/<[^>]+>/g, '').match(/[A-Z0-9]{6}/);
  if (!fallback) {
    throw new Error('Не вдалося розпізнати captcha-код у SVG.');
  }

  return fallback[0];
}

/**
 * Заповнює captcha-відповідь для форми за data-testid префіксом (`root` або `thread`).
 */
async function solveCaptcha(page: Page, formPrefix: 'root' | 'thread'): Promise<void> {
  const captchaImage = page.getByTestId(`${formPrefix}-captcha-image`);
  await expect(captchaImage).toBeVisible();

  const captchaDataUrl = await captchaImage.getAttribute('src');
  if (!captchaDataUrl) {
    throw new Error('Captcha image не містить src.');
  }

  const captchaAnswer = resolveCaptchaAnswerFromDataUrl(captchaDataUrl);
  await page.getByTestId(`${formPrefix}-captcha-answer-input`).fill(captchaAnswer);
}

/**
 * Створює root-коментар через UI та повертає абсолютний URL створеної thread-сторінки.
 */
async function createRootCommentAndOpenThread(page: Page, seed: number): Promise<string> {
  const rootText = `PW root ${seed}`;

  await page.goto('/');
  await page.getByTestId('root-user-name-input').fill('Playwright Root');
  await page.getByTestId('root-email-input').fill('playwright-root@example.com');
  await page.getByTestId('root-text-input').fill(rootText);
  await page.getByTestId('root-attachment-input').setInputFiles({
    name: `root-${seed}.txt`,
    mimeType: 'text/plain',
    buffer: Buffer.from(`Root attachment ${seed}`, 'utf8')
  });

  await solveCaptcha(page, 'root');
  await page.getByTestId('root-submit-button').click();
  await expect(page.getByTestId('root-submit-message')).toContainText('Коментар успішно створено.');

  const createdRootLink = page.getByRole('link', { name: new RegExp(rootText) }).first();
  await expect(createdRootLink).toBeVisible();

  const threadPath = await createdRootLink.getAttribute('href');
  if (!threadPath) {
    throw new Error('Не вдалося отримати href для створеної thread-сторінки.');
  }

  return new URL(threadPath, page.url()).toString();
}

/**
 * Створює root-коментар із PNG-вкладенням та повертає унікальний текст коментаря.
 */
async function createRootCommentWithImageAttachment(page: Page, seed: number): Promise<string> {
  const rootText = `PW root image ${seed}`;

  await page.goto('/');
  await page.getByTestId('root-user-name-input').fill('Playwright Root Image');
  await page.getByTestId('root-email-input').fill('playwright-root-image@example.com');
  await page.getByTestId('root-text-input').fill(rootText);
  await page.getByTestId('root-attachment-input').setInputFiles({
    name: `root-image-${seed}.png`,
    mimeType: 'image/png',
    buffer: tinyPngBuffer
  });

  await solveCaptcha(page, 'root');
  await page.getByTestId('root-submit-button').click();
  await expect(page.getByTestId('root-submit-message')).toContainText('Коментар успішно створено.');
  return rootText;
}

/**
 * Швидкий smoke-тест: перевіряє, що root-сторінка рендериться та має форму створення.
 */
test('root page renders main controls', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('root-refresh-button')).toBeVisible();
  await expect(page.getByTestId('root-create-form')).toBeVisible();
  await expect(page.getByTestId('root-submit-button')).toBeVisible();
});

/**
 * Швидкий smoke-тест: перевіряє, що thread-сторінка відкривається і має reply-форму.
 *
 * Примітка: тест не залежить від seed-даних та сам створює root-коментар для thread URL.
 */
test('thread page renders reply form', async ({ page }) => {
  const seed = Date.now();
  const threadUrl = await createRootCommentAndOpenThread(page, seed);

  await page.goto(threadUrl);

  await expect(page.getByTestId('thread-back-link')).toBeVisible();
  await expect(page.getByTestId('thread-reply-form')).toBeVisible();
  await expect(page.getByTestId('thread-submit-button')).toBeVisible();
});

/**
 * Runtime smoke: створює root-коментар з txt-вкладенням, далі додає reply до створеного root.
 */
test('create root and reply via UI runtime flow', async ({ page }) => {
  const seed = Date.now();
  const replyText = `PW reply ${seed}`;

  const threadUrl = await createRootCommentAndOpenThread(page, seed);
  await page.goto(threadUrl);

  await expect(page.getByTestId('thread-reply-form')).toBeVisible();
  await page.getByTestId('thread-user-name-input').fill('Playwright Reply');
  await page.getByTestId('thread-email-input').fill('playwright-reply@example.com');
  await page.getByTestId('thread-text-input').fill(replyText);
  await page.getByTestId('thread-attachment-input').setInputFiles({
    name: `reply-${seed}.txt`,
    mimeType: 'text/plain',
    buffer: Buffer.from(`Reply attachment ${seed}`, 'utf8')
  });

  await solveCaptcha(page, 'thread');
  await page.getByTestId('thread-submit-button').click();
  await expect(page.getByTestId('thread-submit-message')).toContainText('Відповідь додано.');
  await expect(page.locator('.thread-node').getByText(replyText)).toBeVisible();
});

/**
 * Runtime smoke: перевіряє realtime-оновлення thread між двома вкладками після створення reply.
 */
test('thread realtime update is visible in second tab after reply submit', async ({ browser, page }) => {
  const seed = Date.now();
  const replyText = `PW realtime reply ${seed}`;
  const threadUrl = await createRootCommentAndOpenThread(page, seed);

  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const tabA = await contextA.newPage();
  const tabB = await contextB.newPage();

  try {
    await tabA.goto(threadUrl);
    await tabB.goto(threadUrl);

    await expect(tabA.getByTestId('thread-reply-form')).toBeVisible();
    await expect(tabB.getByTestId('thread-reply-form')).toBeVisible();

    await tabB.getByTestId('thread-user-name-input').fill('Playwright Realtime');
    await tabB.getByTestId('thread-email-input').fill('playwright-realtime@example.com');
    await tabB.getByTestId('thread-text-input').fill(replyText);
    await solveCaptcha(tabB, 'thread');
    await tabB.getByTestId('thread-submit-button').click();
    await expect(tabB.getByTestId('thread-submit-message')).toContainText('Відповідь додано.');

    await expect(tabA.locator('.thread-node').getByText(replyText)).toBeVisible({ timeout: 15_000 });
  } finally {
    await contextA.close();
    await contextB.close();
  }
});

/**
 * Runtime smoke: перевіряє, що root-коментар з PNG-вкладенням рендерить image-preview у списку.
 */
test('create root with png attachment and render image preview', async ({ page }) => {
  const seed = Date.now();
  const rootText = await createRootCommentWithImageAttachment(page, seed);

  const createdRootItem = page.locator('li', {
    has: page.getByRole('link', { name: new RegExp(rootText) })
  });

  await expect(createdRootItem.locator('img.attachment-thumb')).toBeVisible();
  await expect(createdRootItem.getByRole('link', { name: new RegExp(`root-image-${seed}\\.png`) })).toBeVisible();
});

/**
 * Runtime smoke: перевіряє UI-boundary валідацію, коли root-вкладення перевищує 1MB.
 */
test('root form rejects over-limit attachment before submit', async ({ page }) => {
  await page.goto('/');

  const overLimitBuffer = Buffer.alloc(1_000_001, 0x41);
  await page.getByTestId('root-attachment-input').setInputFiles({
    name: 'root-over-limit.txt',
    mimeType: 'text/plain',
    buffer: overLimitBuffer
  });

  await expect(page.getByTestId('root-create-form')).toContainText('Файл перевищує 1MB.');
  await expect(page.getByTestId('root-create-form')).not.toContainText('Вкладення готове: root-over-limit.txt');
});

/**
 * Runtime smoke: перевіряє UI-boundary валідацію для недозволеного MIME у reply-вкладенні.
 */
test('thread form rejects unsupported attachment type before submit', async ({ page }) => {
  const seed = Date.now();
  const threadUrl = await createRootCommentAndOpenThread(page, seed);

  await page.goto(threadUrl);

  await page.getByTestId('thread-attachment-input').setInputFiles({
    name: 'thread-unsupported.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7', 'utf8')
  });

  await expect(page.getByTestId('thread-reply-form')).toContainText('Недозволений тип вкладення.');
  await expect(page.getByTestId('thread-reply-form')).not.toContainText('Вкладення готове: thread-unsupported.pdf');
});
