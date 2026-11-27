import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createApiCatalogClient } from '@graph/api-client';
import { JsonCatalogClient } from '@graph/json-client';
import { loadPermissionsSources, sanitizePermissionsData } from '@graph/catalog-source';
import { addVerificationResource, sourceDigest, verificationId } from './fixtures/add-verification-resource.mjs';

const require = createRequire(import.meta.url);
const { configureApp } = require('../apps/api/dist/bootstrap.js');
const { CatalogImportService } = require('../apps/api/dist/catalog/load/catalog-import.service.js');
const { CatalogImport, CatalogDefinition } = require('../apps/api/dist/catalog/catalog.entities.js');
const { AppModule } = require('../apps/api/dist/app.module.js');
const { validateEnvironment } = require('../apps/api/dist/configuration.js');
const { Test } = require('@nestjs/testing');
const { ConfigService } = require('@nestjs/config');
const { DataSource } = require('typeorm');
const dataRoot = new URL('../data/', import.meta.url);
const graphSource = fileURLToPath(new URL('commercial-graph-permlist.json', dataRoot));
const [graph, powerBi, sharePoint] = [
  '00000003-0000-0000-c000-000000000000',
  '00000009-0000-0000-c000-000000000000',
  '00000003-0000-0ff1-ce00-000000000000'
];
const generatedAt = '2026-11-20T00:00:00.000Z';
const exec = promisify(execFile);

async function directory(t) {
  const path = await mkdtemp(join(tmpdir(), 'catalog-multi-resource-'));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}

async function cli(command, output, { config = '' } = {}) {
  return exec(process.execPath, ['catalog/etl/src/export/cli.mjs', command, '--output', output,
    ...(command === 'export' ? ['--generated-at', generatedAt] : [])],
  { env: { ...process.env, PERMISSIONS_SOURCE: '', PERMISSIONS_SHA256: '', PERMISSIONS_CONFIG: config }, timeout: 15_000 });
}

async function published(directory) {
  const manifestBytes = await readFile(join(directory, 'current.json'));
  const manifest = JSON.parse(manifestBytes);
  const bytes = await readFile(join(directory, manifest.snapshot));
  assert.equal(sourceDigest(bytes), manifest.artifactSha256);
  return { manifestBytes, manifest, bytes, snapshot: JSON.parse(bytes) };
}

function createJson(directory) {
  return new JsonCatalogClient(async (file, signal) => new Response(await readFile(join(directory, file), { signal })));
}

async function openDatabase(t, databasePath) {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ConfigService).useValue(new ConfigService(validateEnvironment({
      SQLITE_PATH: databasePath, PERMISSIONS_SOURCE: '', PERMISSIONS_SHA256: '', PERMISSIONS_CONFIG: ''
    }))).compile();
  const app = module.createNestApplication({ logger: false });
  t.after(() => app.close());
  configureApp(app);
  const database = app.get(DataSource);
  assert.equal(database.options.database, databasePath);
  await database.runMigrations();
  await app.listen(0, '127.0.0.1');
  const config = app.get(ConfigService);
  config.set('PERMISSIONS_SOURCE', '');
  config.set('PERMISSIONS_SHA256', '');
  config.set('PERMISSIONS_CONFIG', '');
  return { http: createApiCatalogClient(`${await app.getUrl()}/api/v1`), database, config, importer: app.get(CatalogImportService) };
}

function neutralSource(source) {
  if (!source) return null;
  const { importedAt, generatedAt: publishedAt, ...base } = source;
  if (importedAt) assert.equal(new Date(importedAt).toISOString(), importedAt);
  if (publishedAt) assert.equal(publishedAt, generatedAt);
  return base;
}

function assertParity(http, json) {
  const { artifact, ...result } = json;
  assert.equal(artifact.schemaVersion, 2);
  assert.deepEqual({ ...result, source: neutralSource(result.source) }, { ...http, source: neutralSource(http.source) });
}

test('default SQLite and schema 2 preserve all three sources, identity, metadata and official fields', async t => {
  const dir = await directory(t);
  const release = join(dir, 'release');
  await cli('export', release);
  await cli('verify', release);
  await cli('export', join(dir, 'copy'));
  const publication = await published(release);
  assert.deepEqual(publication, await published(join(dir, 'copy')));
  const { http, database, config, importer } = await openDatabase(t, join(dir, 'catalog.sqlite'));
  assert.deepEqual(await http.resources(), { dataState: 'not-imported', source: null, items: [] });
  await assert.rejects(http.categories(graph), { status: 404 });

  // Reapply the additive migration over an existing Graph-only database.
  config.set('PERMISSIONS_SOURCE', graphSource);
  const existingGraph = await importer.importFile();
  await database.undoLastMigration();
  assert.ok(!(await database.query('PRAGMA table_info(catalog_import)')).some(column => column.name === 'browseMode'));
  await database.runMigrations();
  config.set('PERMISSIONS_SOURCE', '');
  const batch = await importer.importFile();
  assert.equal(batch.definitionCount, 1917);
  assert.equal(batch.reused, false);
  assert.deepEqual(batch.resources.find(item => item.resourceId === graph),
    { ...existingGraph, resourceId: graph, reused: true });
  assert.deepEqual(await importer.importFile(),
    { ...batch, reused: true, resources: batch.resources.map(item => ({ ...item, reused: true })) });

  const json = createJson(release);
  const [fromHttp, fromJson] = await Promise.all([http.resources(), json.resources()]);
  assert.equal(fromHttp.source, null);
  assert.equal(fromJson.source, null);
  assert.equal(fromJson.artifact.schemaVersion, 2);
  assert.equal(fromHttp.items.length, 3);
  assert.deepEqual(fromHttp.items.map(item => ({ ...item, source: neutralSource(item.source) })),
    fromJson.items.map(item => ({ ...item, source: neutralSource(item.source) })));

  const expectedCounts = [[graph, 'category', 788, 876, 1660, 1034, 60],
    [powerBi, 'family', 2, 202, 204, 202, 0], [sharePoint, 'family', 20, 29, 49, 34, 0]];
  for (const [id, browseMode, appCount, scopeCount, defCount, permissionCount, rscCount] of expectedCounts) {
    const item = fromHttp.items.find(item => item.resourceId === id);
    const model = publication.snapshot.resources.find(item => item.resourceId === id);
    assert.deepEqual([item.browseMode, item.definitionCount, item.permissionCount, item.totalDefinitionCount, item.source.excludedRscCount],
      [browseMode, defCount, permissionCount, appCount + scopeCount, rscCount]);
    const rawBytes = await readFile(new URL(item.source.fileName, dataRoot));
    assert.equal(sourceDigest(rawBytes), item.source.sha256);
    const original = JSON.parse(rawBytes);
    const rolePairs = original.appRoles.map(raw => ['Application', raw]);
    const scopePairs = original.oauth2PermissionScopes.map(raw => ['Delegated', raw]);
    assert.equal(rolePairs.length, appCount);
    assert.equal(scopePairs.length, scopeCount);
    const identity = (type, id) => `${type}/${id}`;
    const expected = new Map([...rolePairs, ...scopePairs].map(([type, raw]) => [identity(type, raw.id), raw]));
    const active = await database.getRepository(CatalogImport).findOneByOrFail({ resourceId: id, active: true });
    assert.equal(active.classificationHash, model.classificationHash);
    const rows = await database.getRepository(CatalogDefinition).findBy({ versionId: active.id });
    assert.deepEqual(new Map(rows.map(row => [identity(row.permissionType, row.id), row.rawDefinition])), expected);
    assert.deepEqual(new Map(model.definitions.map(({ definition, rawDefinition }) =>
      [identity(definition.permissionType, definition.id), rawDefinition])), expected);

    const allRows = await http.permissions(id, { showDisabled: true });
    assertParity(allRows, await json.permissions(id, { showDisabled: true }));
    const allDefinitions = allRows.items.flatMap(row => row.definitions.map(def => ({ ...def, value: row.value })));
    assert.equal(allDefinitions.length, expected.size);
    for (const definition of allDefinitions) {
      const raw = expected.get(identity(definition.permissionType, definition.id));
      assert.equal(definition.value, raw.value);
      assert.equal(definition.isEnabled, raw.isEnabled);
      assert.equal(definition.title, raw.displayName ?? raw.adminConsentDisplayName);
      assert.equal(definition.description, raw.description ?? raw.adminConsentDescription);
      assert.equal(definition.adminConsentRequired, raw.type !== 'User');
      if (definition.permissionType === 'Delegated') {
        assert.equal(definition.userConsentTitle, raw.userConsentDisplayName);
        assert.equal(definition.userConsentDescription, raw.userConsentDescription);
      }
    }
    const categories = await http.categories(id);
    assertParity(categories, await json.categories(id));
    if (browseMode === 'family') {
      assert.deepEqual(categories.items.map(item => item.category), ['all-permissions']);
      assert.ok(allRows.items.every(row => row.family === row.value.split('.')[0]));
    }
  }

  const tenant = await http.detail(powerBi, 'Tenant.Read.All');
  assert.deepEqual(tenant.item.visibleTypes, ['Application', 'Delegated']);
  assertParity(tenant, await json.detail(powerBi, 'Tenant.Read.All'));
  const [graphSites, spoSites] = await Promise.all([graph, sharePoint].map(id => http.detail(id, 'Sites.Read.All')));
  assert.deepEqual(graphSites.item.visibleTypes, ['Application', 'Delegated']);
  assert.deepEqual(spoSites.item.visibleTypes, ['Application']);
  assert.ok(spoSites.allDefinitions.every(def => !graphSites.allDefinitions.some(other => other.id === def.id)));
  assertParity(graphSites, await json.detail(graph, 'Sites.Read.All'));
  assertParity(spoSites, await json.detail(sharePoint, 'Sites.Read.All'));
  await assert.rejects(http.detail(sharePoint, 'Tenant.Read.All'), { status: 404 });
  await assert.rejects(json.detail(graph, 'Tenant.Read.All'), { code: 'not-found' });
});

test('fourth resource uses files and config only; failed batches and publications keep predecessor active', async t => {
  const dir = await directory(t);
  const { configPath, config: catalog } = await addVerificationResource(dir);
  const fourth = catalog.resources.at(-1);
  const release = join(dir, 'publication');
  const { http, database, config, importer } = await openDatabase(t, ':memory:');
  config.set('PERMISSIONS_CONFIG', configPath);
  const first = await importer.importFile();
  assert.equal(first.resources.length, 4);
  await cli('export', release, { config: configPath });
  const publishedFour = await published(release);
  const json = createJson(release);
  assert.equal((await json.resources()).items.length, 4);
  const flat = await http.detail(verificationId, 'Tenant.Read.All');
  assert.equal(flat.item.family, 'Tenant');
  assertParity(flat, await json.detail(verificationId, 'Tenant.Read.All'));
  const activeIds = async () => (await database.getRepository(CatalogImport).findBy({ active: true }))
    .map(row => row.id).sort();
  const originalVersions = await activeIds();

  // Changing the first resource would require a new version; the last source must validate before any write.
  catalog.resources[0].displayName = 'Staged change';
  for (const invalid of [{ appId: 'aaaaaaaa-0000-4000-8000-000000000005' }, { sha256: '0'.repeat(64) }]) {
    catalog.resources[3] = { ...fourth, ...invalid };
    await writeFile(configPath, JSON.stringify(catalog));
    await assert.rejects(importer.importFile(), /App ID|SHA256 mismatch/);
    await assert.rejects(cli('export', release, { config: configPath }), { code: 1 });
    assert.deepEqual(await activeIds(), originalVersions);
    assert.deepEqual(await published(release), publishedFour);
  }
  catalog.resources[3] = { ...fourth, classification: {
    mode: 'categories', version: 'verification-v1',
    categories: [{ category: 'tenant', displayName: 'Tenant', description: 'Synthetic group', families: ['Tenant'] }]
  } };
  delete catalog.resources[0].displayName;
  await writeFile(configPath, JSON.stringify(catalog));
  config.set('PERMISSIONS_CONFIG', configPath);

  // A SQLite failure on the fourth write rolls back the new Power BI version written earlier in the batch.
  catalog.resources[1].displayName = 'Staged Power BI';
  await writeFile(configPath, JSON.stringify(catalog));
  await database.query(`CREATE TRIGGER fail_verification BEFORE INSERT ON catalog_import
    WHEN NEW.resourceId = '${verificationId}' BEGIN SELECT RAISE(ABORT, 'injected batch failure'); END`);
  await assert.rejects(importer.importFile(), /injected batch failure/);
  assert.deepEqual(await activeIds(), originalVersions);
  assert.equal(await database.getRepository(CatalogImport).count(), 4);
  await database.query('DROP TRIGGER fail_verification');
  delete catalog.resources[1].displayName;
  await writeFile(configPath, JSON.stringify(catalog));
  const updated = await importer.importFile();
  assert.deepEqual(updated.resources.filter(row => !row.reused).map(row => row.resourceId), [verificationId]);
  assert.deepEqual((await http.categories(verificationId)).items.map(item => item.category), ['tenant', 'uncategorized']);

  await cli('export', release, { config: configPath });
  assert.equal((await json.detail(verificationId, 'Tenant.Read.All')).item.category, 'all-permissions');
  await json.refresh();
  assertParity(await http.detail(verificationId, 'Tenant.Read.All'), await json.detail(verificationId, 'Tenant.Read.All'));
  const schema2 = await published(release);
  assert.equal(schema2.manifest.schemaVersion, 2);
  for (const alter of [
    candidate => { candidate.resources[1].source.unexpected = 'synthetic'; },
    candidate => { candidate.resources[1].browseMode = 'category'; },
    candidate => { candidate.resources[1].resourceId = candidate.resources[0].resourceId; }
  ]) {
    const candidate = structuredClone(schema2.snapshot);
    alter(candidate);
    const bytes = Buffer.from(JSON.stringify(candidate));
    const manifest = { ...schema2.manifest, artifactSha256: sourceDigest(bytes) };
    const malformed = new JsonCatalogClient(async file => new Response(
      file === 'current.json' ? JSON.stringify(manifest) : bytes));
    await assert.rejects(malformed.resources(), { code: 'invalid-snapshot' });
  }
  await writeFile(join(release, 'current.json'), publishedFour.manifestBytes);
  await cli('verify', release);
  await json.refresh();
  const rolledBack = await json.detail(verificationId, 'Tenant.Read.All');
  assert.equal(rolledBack.artifact.schemaVersion, 2);
  assert.equal(rolledBack.artifact.version, publishedFour.manifest.version);
  assert.equal(rolledBack.item.category, 'all-permissions');

  // A failed refresh keeps the preceding, verified publication pinned.
  await writeFile(join(release, schema2.manifest.snapshot), Buffer.concat([schema2.bytes, Buffer.from(' ')]));
  await writeFile(join(release, 'current.json'), schema2.manifestBytes);
  await assert.rejects(json.refresh(), { code: 'invalid-snapshot' });
  assert.equal((await json.resources()).artifact.version, publishedFour.manifest.version);
  assert.equal((await json.detail(verificationId, 'Tenant.Read.All')).item.category, 'all-permissions');
});

test('source whitelist and config reject missing collections and duplicate identifiers', async t => {
  const dir = await directory(t);
  const { configPath, config } = await addVerificationResource(dir);
  const { data } = (await loadPermissionsSources({ configPath, source: '' })).inputs.at(-1);
  const withMetadata = { ...data, ignoredMetadata: 'synthetic', appRoles: data.appRoles.map(role => ({ ...role, extra: 'synthetic' })) };
  assert.deepEqual(sanitizePermissionsData(withMetadata, verificationId), data);
  assert.throws(() => sanitizePermissionsData({ ...data, resourceSpecificApplicationPermissions: undefined }, verificationId),
    /all three collections/);
  assert.throws(() => sanitizePermissionsData({ ...data, appRoles: [data.appRoles[0], { ...data.appRoles[0], id: data.appRoles[0].id.toUpperCase() }] },
    verificationId), /duplicate permission ID/);
  config.resources.push({ ...config.resources.at(-1), appId: verificationId.toUpperCase(), fileName: 'another.json' });
  await writeFile(configPath, JSON.stringify(config));
  await assert.rejects(loadPermissionsSources({ configPath, source: '' }), /Duplicate resource App ID/);
});
