import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createApiCatalogClient } from '@graph/api-client';
import { JsonCatalogClient } from '@graph/json-client';

const require = createRequire(import.meta.url);
const { Test } = require('@nestjs/testing');
const { ConfigService } = require('@nestjs/config');
const { DataSource } = require('typeorm');
const { AppModule } = require('../apps/api/dist/app.module.js');
const { configureApp } = require('../apps/api/dist/bootstrap.js');
const { validateEnvironment } = require('../apps/api/dist/configuration.js');
const { CatalogImportService } = require('../apps/api/dist/catalog/import/catalog-import.service.js');
const { CatalogCategory, CatalogDefinition, CatalogFamily, CatalogImport } = require('../apps/api/dist/catalog/catalog.entities.js');

const root = fileURLToPath(new URL('..', import.meta.url));
const sourcePath = join(root, 'data/commercial-graph-permlist.json');
const generatedAt = '2026-11-20T00:00:00.000Z';
const run = promisify(execFile);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = (type, id) => `${type}/${id.toLowerCase()}`;
const definitionKeys = definitions => definitions.map(d => identity(d.permissionType, d.id)).sort();

async function setupApi(t, inputPath, sourceSha256) {
  const config = new ConfigService(validateEnvironment({ SQLITE_PATH: ':memory:',
    PERMISSIONS_SOURCE: inputPath, PERMISSIONS_SHA256: sourceSha256 }));
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ConfigService).useValue(config).compile();
  const app = module.createNestApplication({ logger: false });
  t.after(() => app.close());
  configureApp(app);
  const database = app.get(DataSource);
  await database.runMigrations();
  await app.get(CatalogImportService).importFile();
  await app.listen(0, '127.0.0.1');
  return { database, http: createApiCatalogClient(`${await app.getUrl()}/api/v1`) };
}

async function catalogCli(args, inputPath) {
  const env = { ...process.env };
  delete env.PERMISSIONS_SOURCE;
  delete env.PERMISSIONS_SHA256;
  if (inputPath) env.PERMISSIONS_SOURCE = inputPath;
  await run(process.execPath, ['tools/catalog-json/cli.mjs', ...args], { cwd: root, env, timeout: 15_000 });
}

async function publish(output, inputPath) {
  await catalogCli(['export', '--output', output, '--generated-at', generatedAt], inputPath);
  const manifestBytes = await readFile(join(output, 'current.json'));
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.schemaVersion, 1);
  assert.match(manifest.snapshot, /^catalog-[a-zA-Z0-9_-]+\.json$/);
  assert.equal(manifest.snapshot, `catalog-${manifest.version}.json`);
  const snapshotBytes = await readFile(join(output, manifest.snapshot));
  const snapshot = JSON.parse(snapshotBytes);
  assert.equal(snapshot.schemaVersion, manifest.schemaVersion);
  assert.equal(snapshot.version, manifest.version);
  assert.equal(sha256(snapshotBytes), manifest.artifactSha256);
  assert.equal(snapshot.source.generatedAt, generatedAt);
  const artifact = { schemaVersion: manifest.schemaVersion, version: manifest.version, sha256: manifest.artifactSha256 };
  const json = new JsonCatalogClient(async (file, signal) => new Response(await readFile(join(output, file), { signal }), {
    headers: { 'content-type': 'application/json' }
  }));
  return { json, artifact, manifestBytes, snapshotBytes, snapshot };
}

async function assertParity(httpResponse, jsonResponse, artifact, context) {
  const [http, json] = await Promise.all([httpResponse, jsonResponse]);
  const { importedAt, ...httpSource } = http.source;
  const { generatedAt: publishedAt, ...jsonSource } = json.source;
  assert.equal(new Date(importedAt).toISOString(), importedAt);
  assert.equal(publishedAt, generatedAt);
  assert.deepEqual(json.artifact, artifact);
  const { artifact: _artifact, ...jsonResult } = json;
  assert.deepEqual({ ...jsonResult, source: jsonSource }, { ...http, source: httpSource }, context);
  return json;
}

async function assertNotFound(httpResponse, jsonResponse) {
  await Promise.all([
    assert.rejects(httpResponse, { status: 404 }),
    assert.rejects(jsonResponse, { code: 'not-found' })
  ]);
}

function sourceDefinitions(source) {
  return [
    ...source.appRoles.filter(raw => raw.allowedMemberTypes.includes('Application')).map(raw => ({ type: 'Application', raw })),
    ...source.oauth2PermissionScopes.map(raw => ({ type: 'Delegated', raw }))
  ];
}

function assertCounts(result, entries) {
  assert.equal(result.definitionCount, entries.length);
  assert.equal(result.permissionCount, new Set(entries.map(({ raw }) => raw.value)).size);
}

test('versioned offline export matches the source, SQLite rows and all four HTTP routes', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'catalog-json-parity-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const sourceBytes = await readFile(sourcePath);
  const source = JSON.parse(sourceBytes);
  const expected = sourceDefinitions(source);
  const firstOutput = join(dir, 'first');
  const secondOutput = join(dir, 'second');
  const release = await publish(firstOutput);
  const { json, artifact, snapshot } = release;
  const repeated = await publish(secondOutput);
  assert.deepEqual(repeated.manifestBytes, release.manifestBytes);
  assert.deepEqual(repeated.snapshotBytes, release.snapshotBytes);
  await catalogCli(['verify', '--output', firstOutput]);
  assert.deepEqual(await readFile(sourcePath), sourceBytes);

  const invalidInput = join(dir, 'incomplete.json');
  await writeFile(invalidInput, JSON.stringify({ ...source, appRoles: [] }));
  const snapshotFile = `catalog-${artifact.version}.json`;
  await assert.rejects(catalogCli(['export', '--output', firstOutput, '--generated-at', generatedAt], invalidInput), { code: 1 });
  assert.deepEqual((await readdir(firstOutput)).sort(), [snapshotFile, 'current.json'].sort());
  assert.deepEqual(await readFile(join(firstOutput, 'current.json')), release.manifestBytes);
  assert.deepEqual(await readFile(join(firstOutput, snapshotFile)), release.snapshotBytes);

  // Extra JSON whitespace leaves the parsed object unchanged and invalidates the artifact digest.
  const corruptedBytes = Buffer.concat([repeated.snapshotBytes, Buffer.from('\n')]);
  await writeFile(join(secondOutput, snapshotFile), corruptedBytes);
  await assert.rejects(catalogCli(['verify', '--output', secondOutput]), { code: 1 });
  await assert.rejects(catalogCli(['export', '--output', secondOutput, '--generated-at', generatedAt]), { code: 1 });
  assert.deepEqual((await readdir(secondOutput)).sort(), [snapshotFile, 'current.json'].sort());
  assert.deepEqual(await readFile(join(secondOutput, 'current.json')), repeated.manifestBytes);
  assert.deepEqual(await readFile(join(secondOutput, snapshotFile)), corruptedBytes);

  const { http, database } = await setupApi(t, sourcePath, sha256(sourceBytes));
  const active = await database.getRepository(CatalogImport).findOneByOrFail({ active: true });
  assert.equal(snapshot.classificationHash, active.classificationHash);
  assert.match(snapshot.classificationHash, /^[0-9a-f]{64}$/);
  assert.deepEqual(snapshot.source, { fileName: 'commercial-graph-permlist.json', sha256: sha256(sourceBytes), generatedAt,
    classificationVersion: active.source.classificationVersion, excludedRscCount: source.resourceSpecificApplicationPermissions.length });
  assert.equal(snapshot.resources.length, 1);
  const [resource] = snapshot.resources;
  assert.equal(resource.resourceId, source.appId);
  assert.equal(resource.displayName, source.displayName);
  const where = { versionId: active.id };
  const categories = await database.getRepository(CatalogCategory).findBy(where);
  assert.equal(resource.categories.length, categories.length);
  assert.deepEqual(new Map(resource.categories.map(entry => [entry.category, entry])),
    new Map(categories.map(({ versionId, ...entry }) => [entry.category, entry])));
  const families = await database.getRepository(CatalogFamily).findBy(where);
  assert.deepEqual(new Set(resource.families.map(({ category, family }) => JSON.stringify([category, family]))),
    new Set(families.map(({ category, family }) => JSON.stringify([category, family]))));
  assert.equal(resource.families.length, families.length);
  const definitions = await database.getRepository(CatalogDefinition).findBy(where);
  const exported = new Map(resource.definitions.map(entry => [identity(entry.definition.permissionType, entry.definition.id), entry]));
  assert.equal(exported.size, resource.definitions.length);
  assert.deepEqual(exported, new Map(definitions.map(({ id, permissionType, versionId, ...entry }) =>
    [identity(permissionType, id), entry])));
  assert.deepEqual(new Map([...exported].map(([key, entry]) => [key, entry.rawDefinition])),
    new Map(expected.map(({ type, raw }) => [identity(type, raw.id), raw])));

  const id = source.appId;
  const resources = await assertParity(http.resources(), json.resources(), artifact);
  assert.equal(resources.items.length, 1);
  assertCounts(resources.items[0], expected.filter(({ raw }) => raw.isEnabled));
  const mail = expected.filter(({ raw }) => raw.value === 'Mail.Read');
  const mailDelegated = mail.find(({ type }) => type === 'Delegated').raw;
  const guidQuery = { q: `  ${mailDelegated.id.toUpperCase()}  ` };
  const disabled = expected.find(({ raw }) => !raw.isEnabled).raw;
  const cases = [
    [{}, expected.filter(({ raw }) => raw.isEnabled)],
    [{ showDisabled: true }, expected],
    [{ q: ' mAiL.rEaD ' }, expected.filter(({ raw }) => raw.isEnabled &&
      [raw.value, raw.displayName, raw.description, raw.adminConsentDisplayName, raw.adminConsentDescription,
        raw.userConsentDisplayName, raw.userConsentDescription].some(text => text?.toLowerCase().includes('mail.read')))],
    [{ permissionType: 'Delegated', adminConsentRequired: false },
      expected.filter(({ type, raw }) => type === 'Delegated' && raw.type === 'User' && raw.isEnabled)],
    [guidQuery, [{ type: 'Delegated', raw: mailDelegated }]],
    [{ ...guidQuery, category: 'exchange', family: 'Mail' }, [{ type: 'Delegated', raw: mailDelegated }]],
    [{ ...guidQuery, category: 'openid', family: 'Mail' }, []],
    [{ ...guidQuery, permissionType: 'Application' }, []],
    [{ ...guidQuery, adminConsentRequired: true }, []],
    [{ q: disabled.id, showDisabled: false }, []],
    [{ q: disabled.id, showDisabled: true }, expected.filter(({ raw }) => raw.id === disabled.id)],
    [{ q: 'catalog-parity-no-such-value' }, []]
  ];
  for (const [query, matches] of cases) {
    const context = JSON.stringify(query);
    const list = await assertParity(http.permissions(id, query), json.permissions(id, query), artifact, context);
    const categories = await assertParity(http.categories(id, query), json.categories(id, query), artifact, context);
    assert.equal(categories.definitionCount, list.definitionCount);
    assert.equal(categories.permissionCount, list.permissionCount);
    assertCounts(list, matches);
    assert.deepEqual(definitionKeys(list.items.flatMap(row => row.definitions)),
      matches.map(({ type, raw }) => identity(type, raw.id)).sort(), context);
  }

  const detail = await assertParity(http.detail(id, 'Mail.Read', guidQuery), json.detail(id, 'Mail.Read', guidQuery), artifact);
  assert.deepEqual(detail.item.visibleTypes, ['Delegated']);
  assert.deepEqual(definitionKeys(detail.item.definitions), [identity('Delegated', mailDelegated.id)]);
  assert.deepEqual(definitionKeys(detail.allDefinitions), mail.map(({ type, raw }) => identity(type, raw.id)).sort());
  const user = await assertParity(http.detail(id, 'User.Read'), json.detail(id, 'User.Read'), artifact);
  assert.deepEqual(user.item.visibleTypes, ['Delegated']);
  assert.equal(user.allDefinitions.length, 1);
  const showDisabled = { showDisabled: true };
  await assertParity(http.detail(id, disabled.value, showDisabled), json.detail(id, disabled.value, showDisabled), artifact);
  await assertNotFound(http.detail(id, disabled.value), json.detail(id, disabled.value));
  await assertNotFound(http.detail(id, 'mail.read'), json.detail(id, 'mail.read'));

  const later = '2026-11-20T00:00:01.000Z';
  await catalogCli(['export', '--output', firstOutput, '--generated-at', later]);
  const newManifest = JSON.parse(await readFile(join(firstOutput, 'current.json')));
  assert.notEqual(newManifest.version, artifact.version);
  assert.deepEqual(await readFile(join(firstOutput, snapshotFile)), release.snapshotBytes);
  assert.deepEqual((await json.resources()).artifact, artifact);
  await json.refresh();
  const refreshed = await json.resources();
  assert.equal(refreshed.artifact.version, newManifest.version);
  assert.equal(refreshed.source.generatedAt, later);
  assert.deepEqual(refreshed.items, resources.items);
});

test('distinct same-type GUIDs merge by value while filtered detail keeps every definition', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'catalog-json-altered-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const source = JSON.parse(await readFile(sourcePath, 'utf8'));
  const value = 'NewUnknownFamily.Read.All';
  const first = { ...source.appRoles[0], value, id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', isEnabled: true };
  const second = { ...first, id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', isEnabled: false };
  const excluded = { ...first, id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', allowedMemberTypes: ['User'] };
  source.appRoles.push(first, second, excluded);
  const inputPath = join(dir, 'altered.json');
  const sourceBytes = JSON.stringify(source);
  await writeFile(inputPath, sourceBytes);
  const { json, artifact, snapshot } = await publish(join(dir, 'release'), inputPath);
  const { http } = await setupApi(t, inputPath, sha256(sourceBytes));

  assert.equal(snapshot.source.fileName, 'commercial-graph-permlist.json');
  assert.equal(snapshot.source.sha256, sha256(sourceBytes));
  const id = source.appId;
  const browse = { q: value, showDisabled: true };
  const list = await assertParity(http.permissions(id, browse), json.permissions(id, browse), artifact);
  assert.equal(list.permissionCount, 1);
  assert.equal(list.definitionCount, 2);
  const [row] = list.items;
  assert.equal(row.value, value);
  assert.equal(row.category, 'uncategorized');
  assert.equal(row.family, 'NewUnknownFamily');
  assert.deepEqual(row.visibleTypes, ['Application']);
  assert.deepEqual(row.definitions.map(d => [d.id, d.isEnabled]), [[first.id, true], [second.id, false]]);

  const query = { q: second.id.toUpperCase(), permissionType: 'Application', showDisabled: true };
  const detail = await assertParity(http.detail(id, value, query), json.detail(id, value, query), artifact);
  assert.deepEqual(detail.item.definitions.map(d => d.id), [second.id]);
  assert.deepEqual(detail.allDefinitions.map(d => d.id), [first.id, second.id]);
  await assertNotFound(http.detail(id, value, { ...query, showDisabled: false }),
    json.detail(id, value, { ...query, showDisabled: false }));
});
