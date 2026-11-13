import { test, expect } from '@playwright/test';
test('Vite renders the shared shell against real Nest and fits a narrow container', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Microsoft Graph Permissions Explorer' })).toBeVisible();
  await expect(page.getByText('No catalog imported yet.')).toBeVisible();
  await expect(page.getByText('Standalone website', { exact: false })).toBeVisible();
  await page.setViewportSize({ width: 360, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.screenshot({ path: 'test-results/vite-foundation-narrow.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('API errors remain distinct and can be retried', async ({ page }) => {
  await page.route('**/api/v1/resources', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ statusCode: 503, message: 'Test service unavailable' }) }));
  await page.goto('/');
  await expect(page.getByText('Catalog API error:', { exact: false })).toBeVisible();
  await expect(page.getByText('No catalog imported yet.')).toHaveCount(0);
  await page.unroute('**/api/v1/resources');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText('No catalog imported yet.')).toBeVisible();
});
