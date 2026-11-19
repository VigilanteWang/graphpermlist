import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

test('compiled core ESM runs in Chromium without Node or host globals', async ({ page }) => {
  await page.goto('/');
  // Exercise the actual output in the browser, independently from the API's CJS output.
  const moduleUrl = `/@fs${resolve('packages/catalog-core/dist/esm/index.js')}`;
  const result = await page.evaluate(async url => {
    const { queryPermissions, countPermissions, queryDetail } = await import(url);
    const entries = [{ value: 'Synthetic.Read', category: 'test', family: 'Synthetic', definition: {
      permissionType: 'Application', id: '11111111-1111-4111-8111-111111111111',
      isEnabled: true, title: 'Synthetic title', description: 'Synthetic description',
      adminConsentRequired: true, adminConsentRule: 'application-always-required'
    } }];
    return {
      count: countPermissions(queryPermissions('synthetic-resource', entries, { q: '  synthetic.READ  ' })),
      noCrossConsent: queryPermissions('synthetic-resource', entries, { adminConsentRequired: false }),
      types: queryDetail('synthetic-resource', entries, 'Synthetic.Read').item.visibleTypes,
      nodePresent: 'process' in globalThis || 'require' in globalThis
    };
  }, moduleUrl);
  expect(result).toEqual({ count: { permissionCount: 1, definitionCount: 1 },
    noCrossConsent: [], types: ['Application'], nodePresent: false });
});
