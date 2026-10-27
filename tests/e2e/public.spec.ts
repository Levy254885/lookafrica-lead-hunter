import { expect, test } from '@playwright/test';

/** Smoke tests for public pages. They need `npm run dev` (started by Playwright) but no Firebase credentials for static content. */
test('homepage states the product and shows all four plans', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Find your next client');
  for (const price of ['KES 0', 'KES 500', 'KES 1,500', 'KES 4,000']) await expect(page.getByText(price).first()).toBeVisible();
});

test('protected pages redirect to sign-in without a session', async ({ page }) => {
  await page.goto('/app');
  await expect(page).toHaveURL(/\/login/);
});

test('API rejects unauthenticated requests', async ({ request }) => {
  const res = await request.get('/api/leads/export');
  expect(res.status()).toBe(401);
});

test('no emoji appear in the homepage text', async ({ page }) => {
  await page.goto('/');
  const text = await page.locator('body').innerText();
  expect(/\p{Extended_Pictographic}/u.test(text)).toBe(false);
});
