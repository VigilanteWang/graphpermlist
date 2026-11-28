import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

test('Chromium streams the real offline publication, verifies it and queries the pinned version', async ({ page }) => {
  const dir = await mkdtemp(join(tmpdir(), 'catalog-json-browser-'));
  const generatedAt = '2026-11-20T00:00:00.000Z';
  const env = { ...process.env, PERMISSIONS_CONFIG: '' };
  try {
    await promisify(execFile)(process.execPath, ['catalog/etl/src/export/cli.mjs', 'export', '--output', dir,
      '--generated-at', generatedAt], { env, timeout: 15_000 });
    const manifest = JSON.parse(await readFile(join(dir, 'current.json'), 'utf8'));
    const requested: string[] = [];
    await page.route('**/stage-13-files/*', async route => {
      const file = new URL(route.request().url()).pathname.split('/').at(-1)!;
      requested.push(file);
      if (file === 'current.json' || file === manifest.snapshot) {
        await route.fulfill({ path: join(dir, file), contentType: 'application/json' });
      } else {
        await route.fulfill({ status: 404 });
      }
    });
    await page.goto('/');
    const result = await page.evaluate(async moduleUrl => {
      const { JsonCatalogClient } = await import(moduleUrl);
      const client = new JsonCatalogClient((file: string, signal: AbortSignal) =>
        fetch(`/stage-13-files/${file}`, { signal, cache: 'no-store', redirect: 'error' }));
      const [resources, detail] = await Promise.all([
        client.resources(),
        client.detail('00000003-0000-0000-c000-000000000000', 'Mail.Read', { adminConsentRequired: false })
      ]);
      const all = await client.permissions(resources.items[0].resourceId, { showDisabled: true });
      return {
        counts: [resources.items[0].definitionCount, all.definitionCount],
        definitions: [detail.item.definitions.length, detail.allDefinitions.length],
        types: detail.item.visibleTypes,
        source: resources.items[0].source,
        artifact: resources.artifact,
        nodePresent: 'process' in globalThis || 'require' in globalThis
      };
    }, `/@fs${resolve('catalog/json-client/dist/esm/index.js')}`);
    expect(result).toMatchObject({
      counts: [1660, 1664], definitions: [1, 2], types: ['Delegated'],
      source: { generatedAt, excludedRscCount: 60 },
      artifact: { schemaVersion: 2, version: manifest.version, sha256: manifest.artifactSha256 },
      nodePresent: false
    });
    expect(result.source).not.toHaveProperty('importedAt');
    expect(requested).toEqual(['current.json', manifest.snapshot]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Chromium rolls back to a previous verified schema 2 publication', async ({ page }) => {
  const dir = await mkdtemp(join(tmpdir(), 'catalog-json-multi-browser-'));
  const generatedAt = '2026-11-20T00:00:00.000Z';
  const previousGeneratedAt = '2026-11-19T00:00:00.000Z';
  const env = { ...process.env, PERMISSIONS_CONFIG: '' };
  try {
    const run = promisify(execFile);
    const publish = (output: string, timestamp: string) => run(process.execPath,
      ['catalog/etl/src/export/cli.mjs', 'export', '--output', output, '--generated-at', timestamp],
      { env, timeout: 15_000 });
    const current = join(dir, 'current');
    const previous = join(dir, 'previous');
    await Promise.all([publish(current, generatedAt), publish(previous, previousGeneratedAt)]);
    const previousManifest = JSON.parse(await readFile(join(previous, 'current.json'), 'utf8'));
    let active = current;
    const requests: string[] = [];
    await page.route('**/stage-18-files/*', async route => {
      const file = new URL(route.request().url()).pathname.split('/').at(-1)!;
      requests.push(file);
      const directory = active;
      if (file !== 'current.json') active = previous;
      await route.fulfill({ path: join(directory, file), contentType: 'application/json' });
    });
    await page.goto('/');
    const result = await page.evaluate(async moduleUrl => {
      const { JsonCatalogClient } = await import(moduleUrl);
      const client = new JsonCatalogClient((file: string, signal: AbortSignal) =>
        fetch(`/stage-18-files/${file}`, { signal, cache: 'no-store', redirect: 'error' }));
      const graph = '00000003-0000-0000-c000-000000000000';
      const powerBi = '00000009-0000-0000-c000-000000000000';
      const spo = '00000003-0000-0ff1-ce00-000000000000';
      const resources = await client.resources();
      const [tenant, sites, graphSites] = await Promise.all([
        client.detail(powerBi, 'Tenant.Read.All'), client.detail(spo, 'Sites.Read.All'), client.detail(graph, 'Sites.Read.All')
      ]);
      await client.refresh();
      const rollback = await client.resources();
      const rollbackTenant = await client.detail(powerBi, 'Tenant.Read.All');
      return {
        resources, tenant: tenant.item.visibleTypes, tenantSource: tenant.source, sites: sites.allDefinitions,
        graphSites: graphSites.allDefinitions, rollback, rollbackTenant
      };
    }, `/@fs${resolve('catalog/json-client/dist/esm/index.js')}`);
    expect(result.resources).toMatchObject({
      source: null, artifact: { schemaVersion: 2 }, items: [
        { displayName: 'Microsoft Graph', browseMode: 'category', definitionCount: 1660, totalDefinitionCount: 1664 },
        { displayName: 'SharePoint Online', browseMode: 'family', definitionCount: 49, totalDefinitionCount: 49 },
        { displayName: 'Power BI Service', browseMode: 'family', definitionCount: 204, totalDefinitionCount: 204 }
      ]
    });
    expect(result.tenant).toEqual(['Application', 'Delegated']);
    expect(result.tenantSource).toMatchObject({ fileName: 'commercial-powerbi-permlist.json', generatedAt });
    expect(result.sites).toHaveLength(1);
    expect(result.graphSites).toHaveLength(2);
    expect(result.graphSites.map((definition: { id: string }) => definition.id)).not.toContain(result.sites[0].id);
    expect(result.rollback).toMatchObject({
      artifact: { schemaVersion: 2, version: previousManifest.version, sha256: previousManifest.artifactSha256 },
      items: result.resources.items.map((item: { source: object }) =>
        ({ ...item, source: { ...item.source, generatedAt: previousGeneratedAt } }))
    });
    expect(result.rollback.artifact.version).not.toBe(result.resources.artifact.version);
    expect(result.rollbackTenant).toMatchObject({
      item: { visibleTypes: result.tenant }, source: { generatedAt: previousGeneratedAt }
    });
    expect(requests).toHaveLength(4);
    expect(requests.filter(file => file === 'current.json')).toHaveLength(2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
