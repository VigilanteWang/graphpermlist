import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import type { CategoriesResponse, PermissionsResponse, PermissionDetailResponse, PermissionQuery } from '../../packages/contracts/src/index.js';

const resourceId = '00000003-0000-0000-c000-000000000000';
const api = `http://127.0.0.1:3000/api/v1/resources/${resourceId}`;

async function readApi<T>(request: APIRequestContext, path: string, query: PermissionQuery = {}): Promise<T> {
  const response = await request.get(`${api}/${path}`, { params: Object.fromEntries(Object.entries(query).map(([key, value]) => [key, String(value)])) });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<T>;
}

async function openGraph(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Resources' }).getByRole('button', { name: 'Microsoft Graph', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Microsoft Graph', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Exchange', exact: true })).toBeVisible();
}

async function openCategory(page: Page, displayName: string): Promise<void> {
  await page.getByRole('button', { name: `Open ${displayName}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: displayName, exact: true })).toBeVisible();
}

async function assertCounts(page: Page, counts: { permissionCount: number; definitionCount: number }): Promise<void> {
  await expect(page.getByTestId('catalog-counts')).toContainText(`${counts.permissionCount} permissions`);
  await expect(page.getByTestId('catalog-counts')).toContainText(`${counts.definitionCount} definitions`);
}

async function assertRows(page: Page, expected: PermissionsResponse): Promise<void> {
  await assertCounts(page, expected);
  await page.getByRole('button', { name: 'Expand all', exact: true }).click();
  for (const row of expected.items) {
    await expect(page.getByRole('button', { name: row.value, exact: true })).toBeVisible();
  }
}

test('category totals and global search use current real API filters', async ({ page, request }) => {
  await openGraph(page);
  const initial = await readApi<CategoriesResponse>(request, 'categories');
  await assertCounts(page, initial);
  await page.getByTestId('catalog-body').evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
  await page.screenshot({ path: 'test-results/catalog-categories.png', fullPage: true });
  for (const category of initial.items) {
    const card = page.getByRole('button', { name: `Open ${category.displayName}`, exact: true });
    await expect(card).toBeVisible();
    await expect(card).toContainText(`${category.permissionCount} permissions`);
    await expect(card).toContainText(`${category.definitionCount} definitions`);
  }
  const search = page.getByRole('textbox', { name: 'Search permissions', exact: true });
  await search.pressSequentially('Mail.Read', { delay: 30 });
  await expect(search).toBeFocused();
  await assertCounts(page, await readApi<CategoriesResponse>(request, 'categories', { q: 'Mail.Read' }));
  await expect(search).toBeFocused();
  for (const q of ['Mail.Read', 'e1fe6dd8-ba31-4d61-89e7-88639da4683d', 'Sign in and read user profile']) {
    await search.fill(q);
    const expected = await readApi<CategoriesResponse>(request, 'categories', { q });
    await assertCounts(page, expected);
    await expect(page.getByRole('button', { name: /^Open / })).toHaveCount(expected.items.length);
    for (const item of expected.items) await expect(page.getByRole('button', { name: `Open ${item.displayName}`, exact: true })).toBeVisible();
  }
  await search.fill('no-such-permission-browser-regression');
  await assertCounts(page, { permissionCount: 0, definitionCount: 0 });
  await expect(page.getByText('No catalog imported yet.', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Open / })).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await expect(search).toHaveValue('');
  await assertCounts(page, initial);
});

test('category search stays scoped, filters definitions together and returns with its state', async ({ page, request }) => {
  await openGraph(page);
  await page.getByRole('textbox', { name: 'Search permissions', exact: true }).fill('Mail');
  await page.getByLabel('Permission type', { exact: true }).selectOption('Delegated');
  await page.getByLabel('Admin consent', { exact: true }).selectOption('false');
  await openCategory(page, 'Exchange');
  await page.getByRole('textbox', { name: 'Search permissions', exact: true }).fill('Mail.Read');
  await page.getByLabel('Permission type', { exact: true }).selectOption('Application');
  await page.getByLabel('Admin consent', { exact: true }).selectOption('false');
  const empty = await readApi<PermissionsResponse>(request, 'permissions', { category: 'exchange', q: 'Mail.Read', permissionType: 'Application', adminConsentRequired: false });
  expect(empty.items).toEqual([]);
  await assertCounts(page, empty);
  await page.getByLabel('Permission type', { exact: true }).selectOption('Delegated');
  const delegated = await readApi<PermissionsResponse>(request, 'permissions', { category: 'exchange', q: 'Mail.Read', permissionType: 'Delegated', adminConsentRequired: false });
  expect(delegated.items.some(row => row.value === 'Mail.Read')).toBeTruthy();
  await assertRows(page, delegated);
  await page.getByRole('button', { name: 'Back to categories', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Search permissions', exact: true })).toHaveValue('Mail');
  await expect(page.getByLabel('Permission type', { exact: true })).toHaveValue('Delegated');
  await expect(page.getByLabel('Admin consent', { exact: true })).toHaveValue('false');
  const global = await readApi<CategoriesResponse>(request, 'categories', { q: 'Mail', permissionType: 'Delegated', adminConsentRequired: false });
  await assertCounts(page, global);
  await openCategory(page, 'Exchange');
  await page.getByRole('textbox', { name: 'Search permissions', exact: true }).fill('User.Read');
  const scoped = await readApi<PermissionsResponse>(request, 'permissions', { category: 'exchange', q: 'User.Read', permissionType: 'Delegated', adminConsentRequired: false });
  expect(scoped.items).toEqual([]);
  await assertCounts(page, scoped);
});

test('disabled definitions are excluded by default and become inspectable when requested', async ({ page, request }) => {
  await openGraph(page);
  await page.getByRole('textbox', { name: 'Search permissions', exact: true }).fill('AgentCard.Read.All');
  await assertCounts(page, { permissionCount: 0, definitionCount: 0 });
  await page.getByRole('checkbox', { name: 'Show disabled', exact: true }).check();
  const categories = await readApi<CategoriesResponse>(request, 'categories', { q: 'AgentCard.Read.All', showDisabled: true });
  expect(categories.permissionCount).toBe(1);
  await assertCounts(page, categories);
  await openCategory(page, categories.items[0].displayName);
  await page.getByRole('button', { name: 'Expand all', exact: true }).click();
  await page.getByRole('button', { name: 'AgentCard.Read.All', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'AgentCard.Read.All details', exact: true });
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText('aec9e0a0-6f46-4150-a9f7-05e9e3e87399');
  await expect(drawer).toContainText('73ea6732-992c-4292-98f7-9feff18d3ade');
  await expect(drawer.getByText('Disabled', { exact: true })).toHaveCount(2);
});

test('Mail.Read details retain both official definitions despite a Delegated filter', async ({ page, request, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openGraph(page);
  await page.getByLabel('Permission type', { exact: true }).selectOption('Delegated');
  await page.getByLabel('Admin consent', { exact: true }).selectOption('false');
  await openCategory(page, 'Exchange');
  await page.getByRole('textbox', { name: 'Search permissions', exact: true }).fill('Mail.Read');
  await page.getByRole('button', { name: 'Expand all', exact: true }).click();
  const trigger = page.getByRole('button', { name: 'Mail.Read', exact: true });
  await trigger.click();
  const drawer = page.getByRole('dialog', { name: 'Mail.Read details', exact: true });
  await expect(drawer).toBeVisible();
  const detail = await readApi<PermissionDetailResponse>(request, 'permissions/Mail.Read', { category: 'exchange', q: 'Mail.Read', permissionType: 'Delegated', adminConsentRequired: false });
  expect(detail.item.visibleTypes).toEqual(['Delegated']);
  expect(detail.allDefinitions).toHaveLength(2);
  for (const definition of detail.allDefinitions) {
    await expect(drawer).toContainText(definition.id);
    await expect(drawer).toContainText(definition.title.trim());
    await expect(drawer).toContainText(definition.description);
    if (definition.permissionType === 'Delegated') {
      await expect(drawer).toContainText(definition.userConsentTitle.trim());
      await expect(drawer).toContainText(definition.userConsentDescription);
    }
  }
  await expect(drawer).toContainText('Application');
  await expect(drawer).toContainText('Required');
  await expect(drawer).toContainText('Not required');
  await drawer.getByRole('button', { name: 'Copy permission name', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('Mail.Read');
  const copyButtons = drawer.getByRole('button', { name: 'Copy GUID', exact: true });
  await expect(copyButtons).toHaveCount(2);
  await copyButtons.first().click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(detail.allDefinitions.map(item => item.id)).toContain(copied);
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('User.Read opens by keyboard and exposes the actual official scope', async ({ page }) => {
  await openGraph(page);
  await openCategory(page, 'Microsoft Entra ID');
  await page.getByRole('textbox', { name: 'Search permissions', exact: true }).fill('e1fe6dd8-ba31-4d61-89e7-88639da4683d');
  await page.getByRole('button', { name: 'Expand all', exact: true }).click();
  const trigger = page.getByRole('button', { name: 'User.Read', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const drawer = page.getByRole('dialog', { name: 'User.Read details', exact: true });
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText('e1fe6dd8-ba31-4d61-89e7-88639da4683d');
  await expect(drawer).toContainText('Sign in and read user profile');
  await expect(drawer).toContainText('Sign you in and read your profile');
  await expect(drawer).toContainText('Not required');
  await expect(drawer).toContainText('Delegated');
  await expect(drawer).toContainText('Allows users to sign-in to the app');
  await drawer.getByRole('button', { name: 'Close details', exact: true }).click();
  await expect(trigger).toBeFocused();
});

test('search expansion is temporary and clearing restores the previous family state', async ({ page, request }) => {
  await openGraph(page);
  await openCategory(page, 'Exchange');
  const permissions = await readApi<PermissionsResponse>(request, 'permissions', { category: 'exchange' });
  const familyCount = permissions.items.filter(item => item.family === 'Mail').length;
  const mailFamily = page.getByRole('button', { name: `Mail (${familyCount})`, exact: true });
  await expect(mailFamily).toHaveAttribute('aria-expanded', 'false');
  await mailFamily.click();
  await expect(mailFamily).toHaveAttribute('aria-expanded', 'true');
  const search = page.getByRole('textbox', { name: 'Search permissions', exact: true });
  await search.fill('Mail.Read');
  await expect(page.getByRole('button', { name: 'Mail.Read', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await expect(mailFamily).toHaveAttribute('aria-expanded', 'true');
  await page.getByTestId('catalog-body').evaluate(element => Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished)));
  await page.screenshot({ path: 'test-results/catalog-category.png', fullPage: true });
  await page.getByRole('button', { name: 'Collapse all', exact: true }).click();
  await expect(mailFamily).toHaveAttribute('aria-expanded', 'false');
  await search.fill('Mail.Read');
  await expect(page.getByRole('button', { name: 'Mail.Read', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await expect(mailFamily).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'Mail.Read', exact: true })).not.toBeVisible();
  await page.getByLabel('Permission family', { exact: true }).selectOption('Mail');
  const expected = await readApi<PermissionsResponse>(request, 'permissions', { category: 'exchange', family: 'Mail' });
  await assertCounts(page, expected);
  await page.getByRole('button', { name: 'Expand all', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mail.Read', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Calendars \(/ })).toHaveCount(0);
});

for (const endpoint of ['categories', 'permissions', 'detail'] as const) {
  test(`${endpoint} failure is recoverable through Retry without a false empty state`, async ({ page }) => {
    await openGraph(page);
    if (endpoint !== 'categories') await openCategory(page, 'Exchange');
    if (endpoint === 'detail') {
      await page.getByRole('textbox', { name: 'Search permissions', exact: true }).fill('Mail.Read');
      await expect(page.getByRole('button', { name: 'Mail.Read', exact: true })).toBeVisible();
    }
    const pattern = endpoint === 'detail' ? '**/permissions/Mail.Read?*' : `**/${endpoint}?*`;
    await page.route(pattern, route => route.fulfill({
      status: 503, contentType: 'application/json', body: JSON.stringify({ statusCode: 503, message: `${endpoint} temporarily unavailable` })
    }));
    if (endpoint === 'detail') await page.getByRole('button', { name: 'Mail.Read', exact: true }).click();
    else await page.getByRole('textbox', { name: 'Search permissions', exact: true }).fill('Mail.Read');
    await expect(page.getByText(`${endpoint} temporarily unavailable`, { exact: false })).toBeVisible();
    await expect(page.getByText('No catalog imported yet.', { exact: false })).toHaveCount(0);
    await page.unroute(pattern);
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.getByText(`${endpoint} temporarily unavailable`, { exact: false })).toHaveCount(0);
    if (endpoint === 'categories') await expect(page.getByRole('button', { name: 'Open Exchange', exact: true })).toBeVisible();
    else if (endpoint === 'permissions') await expect(page.getByRole('button', { name: 'Mail.Read', exact: true })).toBeVisible();
    else await expect(page.getByRole('dialog', { name: 'Mail.Read details', exact: true })).toContainText('810c84a8-4a9e-49e6-bf7d-12d183f40d01');
  });
}

test('a late obsolete search response cannot overwrite the newest results', async ({ page, request }) => {
  await openGraph(page);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let markStarted!: () => void;
  const started = new Promise<void>(resolve => { markStarted = resolve; });
  let markFinished!: () => void;
  const finished = new Promise<void>(resolve => { markFinished = resolve; });
  await page.route('**/categories?*', async route => {
    if (new URL(route.request().url()).searchParams.get('q') !== 'Mail.Read') return route.continue();
    const actual = await route.fetch();
    markStarted();
    await held;
    await route.fulfill({ response: actual }).catch(() => undefined);
    markFinished();
  });
  const search = page.getByRole('textbox', { name: 'Search permissions', exact: true });
  await search.fill('Mail.Read');
  await started;
  await search.fill('User.Read');
  const expected = await readApi<CategoriesResponse>(request, 'categories', { q: 'User.Read' });
  try {
    await assertCounts(page, expected);
  } finally {
    release();
  }
  await finished;
  await expect(search).toHaveValue('User.Read');
  await assertCounts(page, expected);
  await expect(page.getByRole('button', { name: 'Open Exchange', exact: true })).toHaveCount(0);
});

test('320/360px screens and a 320px embedded host wrap long real details without horizontal overflow', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openGraph(page);
  await expect(page.getByTestId('catalog-body')).toHaveCSS('animation-name', 'none');
  await expect(page.getByTestId('catalog-body')).toHaveCSS('animation-duration', '0s');
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 800 });
    await expect(page.getByRole('textbox', { name: 'Search permissions', exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('#root').evaluate(element => { element.style.width = '320px'; element.style.maxWidth = '320px'; });
  await expect(page.getByRole('button', { name: 'Open Microsoft Entra ID', exact: true })).toBeVisible();
  await expect.poll(() => page.locator('#root').evaluate(element => element.scrollWidth)).toBeLessThanOrEqual(320);
  await openCategory(page, 'Microsoft Entra ID');
  await page.getByRole('textbox', { name: 'Search permissions', exact: true }).fill('CustomSecAttributeAssignment.ReadWrite.All');
  await expect(page.getByRole('button', { name: 'CustomSecAttributeAssignment.ReadWrite.All', exact: true })).toBeVisible();
  await expect.poll(() => page.locator('#root').evaluate(element => element.scrollWidth)).toBeLessThanOrEqual(320);
  await page.getByRole('button', { name: 'CustomSecAttributeAssignment.ReadWrite.All', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'CustomSecAttributeAssignment.ReadWrite.All details', exact: true });
  await expect(drawer).toBeVisible();
  await page.locator('#root').evaluate(element => { element.style.removeProperty('width'); element.style.removeProperty('max-width'); });
  await page.setViewportSize({ width: 320, height: 800 });
  await expect.poll(() => drawer.evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect.poll(() => drawer.evaluate(element => Math.round(element.getBoundingClientRect().top))).toBe(0);
  await expect.poll(() => drawer.evaluate(element => Math.round(element.getBoundingClientRect().right))).toBe(320);
  await expect.poll(() => drawer.evaluate(element => Math.round(element.getBoundingClientRect().height))).toBe(800);
  await drawer.evaluate(element => Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished)));
  await page.screenshot({ path: 'test-results/catalog-details-narrow.png', fullPage: false });
});


test('page transitions animate the catalog body while resource navigation and filters stay fixed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openGraph(page);
  const search = page.getByRole('textbox', { name: 'Search permissions', exact: true });
  const navigation = page.getByRole('navigation', { name: 'Resources' });
  const searchPosition = await search.boundingBox();
  const navigationPosition = await navigation.boundingBox();
  const motion = await page.getByTestId('catalog-body').evaluate(element => {
    const style = getComputedStyle(element);
    return { name: style.animationName, duration: Number.parseFloat(style.animationDuration) };
  });
  expect(motion.name).not.toBe('none');
  expect(motion.duration).toBeGreaterThan(0);
  expect(motion.duration).toBeLessThanOrEqual(0.3);
  await openCategory(page, 'Exchange');
  await expect(navigation).toHaveCSS('animation-name', 'none');
  await expect(search).toHaveCSS('animation-name', 'none');
  expect(await search.boundingBox()).toEqual(searchPosition);
  expect(await navigation.boundingBox()).toEqual(navigationPosition);
});

test('clipboard failure offers the actual value for manual copying without claiming success', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Clipboard permission denied'); } } }));
  await openGraph(page);
  await openCategory(page, 'Exchange');
  await page.getByRole('textbox', { name: 'Search permissions', exact: true }).fill('Mail.Read');
  await page.getByRole('button', { name: 'Mail.Read', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Mail.Read details', exact: true });
  await drawer.getByRole('button', { name: 'Copy permission name', exact: true }).click();
  await expect(drawer.getByRole('textbox', { name: 'permission name for manual copy', exact: true })).toHaveValue('Mail.Read');
  await expect(drawer.getByText('Copy failed.', { exact: false })).toBeVisible();
  await expect(drawer.getByText('permission name copied.', { exact: true })).toHaveCount(0);
});


test('shared styles leave host siblings unchanged and modal keyboard focus stays inside details', async ({ page }) => {
  await openGraph(page);
  await page.evaluate(() => {
    const sentinel = document.createElement('section');
    sentinel.id = 'host-sentinel';
    sentinel.innerHTML = '<h1>Host heading</h1><button>Host action</button><input aria-label="Host input">';
    document.body.append(sentinel);
  });
  const readStyles = () => page.locator('#host-sentinel').evaluate(element => [...element.querySelectorAll('*')].map(child => {
    const style = getComputedStyle(child);
    return { tag: child.tagName, color: style.color, fontFamily: style.fontFamily, fontSize: style.fontSize, margin: style.margin, border: style.border, background: style.backgroundColor, boxSizing: style.boxSizing };
  }));
  const before = await readStyles();
  await openCategory(page, 'Exchange');
  await page.getByRole('textbox', { name: 'Search permissions', exact: true }).fill('Mail.Read');
  await page.getByRole('button', { name: 'Mail.Read', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Mail.Read details', exact: true });
  await expect(drawer).toContainText('810c84a8-4a9e-49e6-bf7d-12d183f40d01');
  await drawer.getByRole('button', { name: 'Close details', exact: true }).focus();
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press('Tab');
    expect(await drawer.evaluate(element => element.contains(document.activeElement))).toBeTruthy();
  }
  expect(await readStyles()).toEqual(before);
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  expect(await readStyles()).toEqual(before);
});
