import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

test('Chromium streams the real offline publication, verifies it and queries the pinned version', async ({ page }) => {
  const dir = await mkdtemp(join(tmpdir(), 'catalog-json-browser-'));
  const generatedAt = '2026-11-20T00:00:00.000Z';
  const env = { ...process.env };
  delete env.PERMISSIONS_SOURCE;
  delete env.PERMISSIONS_SHA256;
  try {
    await promisify(execFile)(process.execPath, ['tools/catalog-json/cli.mjs', 'export', '--output', dir,
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
        source: resources.source,
        artifact: resources.artifact,
        nodePresent: 'process' in globalThis || 'require' in globalThis
      };
    }, `/@fs${resolve('catalog/json-client/dist/esm/index.js')}`);
    expect(result).toMatchObject({
      counts: [1660, 1664], definitions: [1, 2], types: ['Delegated'],
      source: { generatedAt, excludedRscCount: 60 },
      artifact: { schemaVersion: 1, version: manifest.version, sha256: manifest.artifactSha256 },
      nodePresent: false
    });
    expect(result.source).not.toHaveProperty('importedAt');
    expect(requested).toEqual(['current.json', manifest.snapshot]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
