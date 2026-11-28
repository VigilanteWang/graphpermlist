import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import type { CatalogApiResourceListResponse } from '../../common/contracts/src/index.js';

const api = `http://127.0.0.1:${Number(process.env.CATALOG_TEST_API_PORT ?? 3000)}/api/v1/resources`;
const verificationId = 'aaaaaaaa-0000-4000-8000-000000000004';

async function readResources(request: APIRequestContext): Promise<CatalogApiResourceListResponse['items']> {
  const response = await request.get(api);
  expect(response.ok()).toBeTruthy();
  const resources: CatalogApiResourceListResponse = await response.json();
  expect(resources.dataState).toBe('ready');
  return resources.items;
}

function resourceNav(page: Page, displayName: string) {
  return page.getByRole('navigation', { name: 'Resources' }).getByRole('button', { name: displayName, exact: true });
}

test('Home and navigation discover real API resources with their own counts and sources', async ({ page, request }) => {
  const resources = await readResources(request);
  expect(resources.map((item) => item.displayName)).toEqual(expect.arrayContaining([
    'Microsoft Graph', 'Power BI Service', 'SharePoint Online'
  ]));
  await page.goto('/');
  const cards = page.getByRole('group', { name: 'API resources', exact: true });
  await expect(cards.getByRole('button')).toHaveCount(resources.length);
  await expect(page.getByRole('navigation', { name: 'Resources' }).getByRole('button')).toHaveCount(resources.length + 1);

  for (const resource of resources) {
    const { displayName, source, permissionCount, definitionCount, totalDefinitionCount } = resource;
    const browseCard = cards.getByRole('button', { name: `Browse ${displayName}`, exact: true });
    await expect(browseCard).toBeEnabled();
    await expect(browseCard).toHaveAccessibleDescription(
      `${permissionCount} permissions · ${definitionCount} enabled definitions ${totalDefinitionCount} definitions including disabled`
    );
    await expect(resourceNav(page, displayName)).toBeEnabled();

    expect(source).toBeDefined();
    if (!source) throw new Error(`Missing source for ${displayName}`);
    const detailsLabel = `${displayName} catalog data details`;
    const metadata = page.getByRole('table', { name: detailsLabel, exact: true });
    await page.getByRole('button', { name: detailsLabel, exact: true }).press('Enter');
    await expect(metadata.getByText(source.fileName, { exact: true })).toBeVisible();
    await expect(metadata.getByText(source.sha256, { exact: true })).toBeVisible();
    await expect(metadata.getByRole('row').filter({ hasText: 'RSC definitions excluded' })).toContainText(String(source.excludedRscCount));
  }

  await page.getByRole('button', { name: 'Browse Power BI Service', exact: true }).press('Enter');
  await expect(page.getByRole('heading', { name: 'Power BI Service', exact: true })).toBeFocused();
  await expect(resourceNav(page, 'Power BI Service')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: /^Tenant \(/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Open / })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Back to categories', exact: true })).toHaveCount(0);
});

test('Power BI merges Application and Delegated Tenant.Read.All on the same row', async ({ page }) => {
  await page.goto('/');
  await resourceNav(page, 'Power BI Service').press('Enter');
  await page.getByRole('button', { name: /^Tenant \(/ }).press('Enter');
  const trigger = page.getByRole('button', { name: 'Tenant.Read.All', exact: true });
  await expect(trigger).toHaveCount(1);
  const row = page.getByRole('row').filter({ has: trigger });
  await expect(row).toContainText('Application');
  await expect(row).toContainText('Delegated');
  await trigger.press('Enter');
  const drawer = page.getByRole('dialog', { name: 'Tenant.Read.All details', exact: true });
  await expect(drawer).toContainText('654b31ae-d941-4e22-8798-7add8fdf049f');
  await expect(drawer).toContainText('01944dba-21df-426f-bb8c-796488be96ad');
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('resource changes keep shared criteria and isolate category, family and permission details', async ({ page }) => {
  await page.goto('/');
  await resourceNav(page, 'Microsoft Graph').press('Enter');
  const search = page.getByRole('textbox', { name: 'Search permissions', exact: true });
  const permissionType = page.getByLabel('Permission type', { exact: true });
  const adminConsent = page.getByLabel('Admin consent', { exact: true });
  const showDisabled = page.getByRole('checkbox', { name: 'Show disabled', exact: true });
  const family = page.getByLabel('Permission family', { exact: true });
  await search.fill('Sites.Read.All');
  await permissionType.selectOption('Application');
  await adminConsent.selectOption('true');
  await showDisabled.check();
  await family.selectOption('Sites');

  const graphCategory = page.getByRole('button', { name: 'Open SharePoint / OneDrive', exact: true });
  await graphCategory.press('Enter');
  await expect(page.getByRole('heading', { name: 'SharePoint / OneDrive', exact: true })).toBeFocused();
  const trigger = page.getByRole('button', { name: 'Sites.Read.All', exact: true });
  const drawer = page.getByRole('dialog', { name: 'Sites.Read.All details', exact: true });
  const graphDefinitionId = '332a536c-c7ef-4017-ab91-336970924f0d';
  const spoDefinitionId = 'd13f72ca-a275-4b96-b789-48ebcc4da984';
  await trigger.press('Enter');
  await expect(drawer).toContainText(graphDefinitionId);
  await expect(drawer).not.toContainText(spoDefinitionId);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();

  await resourceNav(page, 'SharePoint Online').press('Enter');
  await expect(page.getByRole('heading', { name: 'SharePoint Online', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to categories', exact: true })).toHaveCount(0);
  await expect(drawer).toHaveCount(0);
  await expect(search).toHaveValue('Sites.Read.All');
  await expect(permissionType).toHaveValue('Application');
  await expect(adminConsent).toHaveValue('true');
  await expect(showDisabled).toBeChecked();
  await expect(family).toHaveValue('');
  await trigger.press('Enter');
  await expect(drawer).toContainText(spoDefinitionId);
  await expect(drawer).not.toContainText(graphDefinitionId);
  await page.keyboard.press('Escape');

  await family.selectOption('Sites');
  await resourceNav(page, 'Home').press('Enter');
  await page.getByRole('button', { name: 'Browse Microsoft Graph', exact: true }).press('Enter');
  await expect(family).toHaveValue('');
  await expect(search).toHaveValue('Sites.Read.All');
  await graphCategory.press('Enter');
  await page.getByRole('button', { name: 'Back to categories', exact: true }).press('Enter');
  await expect(graphCategory).toBeFocused();
});

test('a configured fourth resource keeps expansion separate for the same family', async ({ page, request }) => {
  test.skip(!process.env.CATALOG_TEST_RESOURCE_CONFIG, 'The extra resource uses an isolated test configuration.');
  const resources = await readResources(request);
  expect(resources.find((item) => item.resourceId === verificationId)).toMatchObject({
    displayName: 'Verification Resource', browseMode: 'family'
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Browse Verification Resource', exact: true })).toBeEnabled();

  const tenantFamily = page.getByRole('button', { name: /^Tenant \(/ });
  const tenantRead = page.getByRole('button', { name: 'Tenant.Read.All', exact: true });
  await resourceNav(page, 'Power BI Service').press('Enter');
  await tenantFamily.press('Enter');
  await expect(tenantRead).toBeVisible();
  await resourceNav(page, 'Verification Resource').press('Enter');
  await expect(page.getByRole('heading', { name: 'Verification Resource', exact: true })).toBeVisible();
  await expect(tenantFamily).toHaveAttribute('aria-expanded', 'false');
  await expect(tenantRead).not.toBeVisible();
  await tenantFamily.press('Enter');
  await expect(tenantRead).toBeVisible();
  await tenantFamily.press('Enter');
  await resourceNav(page, 'Power BI Service').press('Enter');
  await expect(tenantFamily).toHaveAttribute('aria-expanded', 'true');
  await expect(tenantRead).toBeVisible();
});
