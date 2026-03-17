import { expect, test } from '@playwright/test';

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
 * Примітка: використовує стабільний rootId=1, який очікується в seed/dev-даних.
 */
test('thread page renders reply form', async ({ page }) => {
  await page.goto('/thread/1');

  await expect(page.getByTestId('thread-back-link')).toBeVisible();
  await expect(page.getByTestId('thread-reply-form')).toBeVisible();
  await expect(page.getByTestId('thread-submit-button')).toBeVisible();
});
