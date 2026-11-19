import { test, expect } from '@playwright/test';

test('Home connects to the imported catalog and resource navigation returns Home', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Microsoft Graph Permissions Explorer', exact: true })).toBeVisible();
  await expect(page.getByText('Standalone website', { exact: false })).toBeVisible();
  const all = await request.get(`http://127.0.0.1:${Number(process.env.CATALOG_TEST_API_PORT ?? 3000)}/api/v1/resources/00000003-0000-0000-c000-000000000000/permissions?showDisabled=true`);
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
  await expect(page.getByText('Catalog error:', { exact: false })).toHaveCount(0);
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


test('desktop sidebar spans the viewport and stays put when the main catalog scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1754, height: 1055 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Resources' });
  const main = page.getByRole('main');
  const footer = nav.getByText('Standalone website', { exact: false });
  await expect(page.getByRole('button', { name: 'Browse Microsoft Graph', exact: true })).toBeVisible();
  const bounds = await nav.boundingBox();
  expect(bounds?.y).toBe(0);
  expect(bounds?.height).toBe(1055);
  const footerBounds = await footer.boundingBox();
  expect(footerBounds!.y + footerBounds!.height).toBeGreaterThan(1000);
  const titleSize = await nav.locator('strong').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  const buttonSize = await nav.getByRole('button', { name: 'Home', exact: true }).evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  expect(titleSize).toBeGreaterThan(buttonSize);
  const inactive = nav.getByRole('button', { name: 'Microsoft Graph', exact: true });
  await expect(inactive).toHaveAttribute('aria-current', 'false');
  await inactive.click();
  await expect(inactive).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: 'Open Exchange', exact: true })).toBeVisible();
  await main.evaluate(el => { el.scrollTop = el.scrollHeight; });
  expect(await main.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  expect(await nav.boundingBox()).toEqual(bounds);
  expect(await footer.boundingBox()).toEqual(footerBounds);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await nav.getByRole('button', { name: 'Home', exact: true }).click();
  await expect.poll(() => main.evaluate(el => el.scrollTop)).toBe(0);
});

test('Home explains permissions and resource cards resize within bounds with keyboard access', async ({ page }) => {
  for (const width of [1754, 1000, 800, 360, 320]) {
    await page.setViewportSize({ width, height: 1055 });
    await page.goto('/');
    const cards = page.getByLabel('API resources').getByRole('button');
    await expect(cards).toHaveCount(3);
    const boxes = await cards.evaluateAll(elements => elements.map(el => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height, scroll: el.scrollWidth, client: el.clientWidth };
    }));
    for (const box of boxes) {
      expect(box.width).toBeGreaterThanOrEqual(240);
      expect(box.width).toBeLessThanOrEqual(340);
      expect(box.height).toBe(200);
      expect(box.scroll).toBeLessThanOrEqual(box.client);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (width === 800) expect(boxes[0].width).toBeLessThan(340);
  }
  for (const term of ['Catalog', 'Permission', 'Definition', 'How permissions are organized', 'One name, one row']) {
    await expect(page.getByRole('table', { name: 'Catalog glossary', exact: true }).getByRole('rowheader', { name: term, exact: true })).toBeVisible();
  }
  await expect(page.getByText('Source snapshot', { exact: true })).not.toBeVisible();
  const cards = page.getByLabel('API resources');
  await expect(cards.getByRole('button', { name: 'Power BI', exact: false })).toBeDisabled();
  await expect(cards.getByRole('button', { name: 'SharePoint', exact: false })).toBeDisabled();
  await page.getByRole('main').evaluate(el => { el.scrollTop = 0; });
  await page.getByRole('button', { name: 'Browse Microsoft Graph', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Microsoft Graph', exact: true })).toBeVisible();
});

test('neutral source metadata shows generation time without inventing an import time', async ({ page }) => {
  await page.route('**/api/v1/resources', async route => {
    const response = await route.fetch();
    const body = await response.json();
    const { importedAt: _importedAt, ...source } = body.source;
    body.source = { ...source, generatedAt: '2026-11-17T00:00:00Z' };
    await route.fulfill({ response, json: body });
  });
  await page.goto('/');
  await page.getByText('Catalog data details', { exact: true }).click();
  await expect(page.getByText('Generated at (UTC)', { exact: true })).toBeVisible();
  await expect(page.getByText('2026-11-17T00:00:00Z', { exact: true })).toBeVisible();
  await expect(page.getByText('Imported at (UTC)', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Source SHA-256', { exact: true })).toBeVisible();
});


test('Fluent resource navigation supports keyboard selection and preserves catalog state across Home', async ({ page }) => {
  let resourceReads = 0;
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/v1/resources') resourceReads++;
  });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Resources' });
  const home = nav.getByRole('button', { name: 'Home', exact: true });
  const graph = nav.getByRole('button', { name: 'Microsoft Graph', exact: true });
  await expect(home).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('button', { name: 'Power BI · Coming soon', exact: true })).toBeDisabled();
  await expect(nav.getByRole('button', { name: 'SharePoint · Coming soon', exact: true })).toBeDisabled();
  await graph.focus();
  await page.keyboard.press('Enter');
  await expect(graph).toHaveAttribute('aria-current', 'page');
  await page.getByRole('textbox', { name: 'Search permissions', exact: true }).fill('Mail.Read');
  await page.getByRole('button', { name: 'Open Exchange', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mail.Read', exact: true })).toBeVisible();
  await home.focus();
  await page.keyboard.press('Space');
  await expect(home).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: 'Microsoft Graph Permissions Explorer', exact: true })).toBeVisible();
  await graph.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Search permissions', exact: true })).toHaveValue('Mail.Read');
  await expect(page.getByRole('button', { name: 'Open Exchange', exact: true })).toBeVisible();
  expect(resourceReads).toBe(1);
});

test('Fluent source accordion exposes keyboard expansion and accessible metadata row headers', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Catalog data details', exact: true });
  const source = page.getByRole('table', { name: 'Catalog data details', exact: true });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(source).not.toBeVisible();
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(source.getByRole('rowheader', { name: 'Source snapshot', exact: true })).toBeVisible();
  await expect(source.getByRole('rowheader', { name: 'Imported at (UTC)', exact: true })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(source).not.toBeVisible();
});
