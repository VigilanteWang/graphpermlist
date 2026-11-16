import { test, expect } from '@playwright/test';

test('Home connects to the imported catalog and resource navigation returns Home', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Microsoft Graph Permissions Explorer', exact: true })).toBeVisible();
  await expect(page.getByText('Standalone website', { exact: false })).toBeVisible();
  const all = await request.get('http://127.0.0.1:3000/api/v1/resources/00000003-0000-0000-c000-000000000000/permissions?showDisabled=true');
  expect(all.ok()).toBeTruthy();
  await expect(page.getByText(String((await all.json()).definitionCount), { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/catalog-home.png', fullPage: true });
  await page.getByRole('navigation', { name: 'Resources' }).getByRole('button', { name: 'Microsoft Graph', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Microsoft Graph', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Exchange', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Microsoft Graph Permissions Explorer', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('not-imported remains distinct from the real ready catalog', async ({ page }) => {
  await page.route('**/api/v1/resources', route => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ dataState: 'not-imported', source: null, items: [] })
  }));
  await page.goto('/');
  await expect(page.getByText('No catalog imported yet.', { exact: false })).toBeVisible();
  await expect(page.getByText('Catalog API error:', { exact: false })).toHaveCount(0);
});

test('resource errors remain errors and Retry loads the real catalog', async ({ page }) => {
  await page.route('**/api/v1/resources', route => route.fulfill({
    status: 503, contentType: 'application/json', body: JSON.stringify({ statusCode: 503, message: 'Test service unavailable' })
  }));
  await page.goto('/');
  await expect(page.getByText('Test service unavailable', { exact: false })).toBeVisible();
  await expect(page.getByText('No catalog imported yet.', { exact: false })).toHaveCount(0);
  await page.unroute('**/api/v1/resources');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Resources' }).getByRole('button', { name: 'Microsoft Graph', exact: true })).toBeEnabled();
  await expect(page.getByText('Test service unavailable', { exact: false })).toHaveCount(0);
});

test('loading is visible while the real resource response is pending', async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/v1/resources', async route => {
    const response = await route.fetch();
    await held;
    await route.fulfill({ response });
  });
  await page.goto('/');
  try {
    await expect(page.getByText('Loading catalog', { exact: false })).toBeVisible();
    await expect(page.getByText('No catalog imported yet.', { exact: false })).toHaveCount(0);
  } finally {
    release();
  }
  await expect(page.getByRole('heading', { name: 'Microsoft Graph Permissions Explorer', exact: true })).toBeVisible();
});
