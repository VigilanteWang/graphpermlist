import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { JsonCatalogClient } from '@graph/json-client';
import { JSON_MANIFEST_MAX_BYTES } from '@graph/catalog-json/validation';

const resourceId = 'abcdef01-1234-4123-8123-0123456789ab';
const absentResourceId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const appId = '11111111-1111-4111-8111-111111111111';
const otherAppId = '22222222-2222-4222-8222-222222222222';
const delegatedId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const disabledId = '44444444-4444-4444-8444-444444444444';
const value = 'Example.Read';
const category = { category: 'example', displayName: 'Example service', description: 'Synthetic permissions' };
const location = { value, category: category.category, family: 'Example' };

function application(id, enabled = true) {
  const rawDefinition = { id, value, isEnabled: enabled, allowedMemberTypes: ['Application'], origin: 'Application',
    displayName: 'Synthetic application title', description: 'Synthetic application message' };
  return { ...location, rawDefinition, definition: { permissionType: 'Application', id, isEnabled: enabled,
    title: rawDefinition.displayName, description: rawDefinition.description, adminConsentRequired: true,
    adminConsentRule: 'application-always-required' } };
}

function delegated() {
  const rawDefinition = { id: delegatedId, value, isEnabled: true, type: 'User',
    adminConsentDisplayName: 'Synthetic delegated title', adminConsentDescription: 'Synthetic delegated message',
    userConsentDisplayName: 'Unique user consent title', userConsentDescription: 'Synthetic user consent message' };
  return { ...location, rawDefinition, definition: { permissionType: 'Delegated', id: delegatedId, isEnabled: true,
    title: rawDefinition.adminConsentDisplayName, description: rawDefinition.adminConsentDescription,
    consentType: rawDefinition.type, userConsentTitle: rawDefinition.userConsentDisplayName,
    userConsentDescription: rawDefinition.userConsentDescription, adminConsentRequired: false,
    adminConsentRule: 'delegated-consent-type' } };
}

function snapshot(version = 'test-v1') {
  return { schemaVersion: 1, version, classificationHash: '1'.repeat(64),
    source: { fileName: 'example-source.json', sha256: '2'.repeat(64), classificationVersion: 'fixture-1',
      generatedAt: '2026-11-17T00:00:00.000Z', excludedRscCount: 1 },
    resources: [{ resourceId, displayName: `Synthetic resource ${version}`, categories: [{ ...category }],
      families: [{ category: category.category, family: 'Example' }],
      definitions: [application(appId), delegated(), application(otherAppId), application(disabledId, false)] }] };
}

function publication(data = snapshot()) {
  const bytes = JSON.stringify(data, null, 2) + '\n';
  const manifest = { schemaVersion: 1, version: data.version, snapshot: `catalog-${data.version}.json`,
    artifactSha256: createHash('sha256').update(bytes).digest('hex') };
  return { manifest, bytes };
}

function fileResponse({ manifest, bytes }, file) {
  if (file === 'current.json') return Response.json(manifest);
  assert.equal(file, manifest.snapshot);
  return new Response(bytes, { headers: { 'Content-Type': 'application/json' } });
}

function clientFor(files = publication()) {
  const calls = [];
  const client = new JsonCatalogClient(async (file, signal) => {
    calls.push({ file, signal });
    return fileResponse(files, file);
  });
  return { client, calls };
}

test('JSON client pins a verified publication and serves all four queries from memory', async () => {
  const data = snapshot();
  const files = publication(data);
  const { client, calls } = clientFor(files);
  assert.equal(client.state, 'idle');

  const resources = await client.resources();
  const metadata = { dataState: 'ready', source: data.source,
    artifact: { schemaVersion: 1, version: data.version, sha256: files.manifest.artifactSha256 } };
  assert.equal(client.state, 'ready');
  assert.deepEqual(resources, { ...metadata,
    items: [{ resourceId, displayName: data.resources[0].displayName, permissionCount: 1, definitionCount: 3 }] });
  assert.deepEqual(await client.categories(resourceId, { showDisabled: true }), {
    ...metadata, permissionCount: 1, definitionCount: 4,
    items: [{ ...category, permissionCount: 1, definitionCount: 4 }]
  });
  const app = application(appId).definition;
  const otherApp = application(otherAppId).definition;
  const user = delegated().definition;
  const disabled = application(disabledId, false).definition;
  const item = { resourceId, ...location, visibleTypes: ['Application', 'Delegated'], definitions: [app, otherApp, user] };
  assert.deepEqual(await client.permissions(resourceId.toUpperCase(), { category: 'example', family: 'Example' }), {
    ...metadata, permissionCount: 1, definitionCount: 3, items: [item]
  });
  const query = { q: `  ${delegatedId.toUpperCase()}  `, permissionType: 'Delegated', adminConsentRequired: false };
  assert.deepEqual(await client.detail(resourceId, value, query), { ...metadata,
    item: { ...item, visibleTypes: ['Delegated'], definitions: [user] },
    allDefinitions: [app, otherApp, disabled, user] });
  assert.deepEqual(await client.permissions(resourceId, { permissionType: 'Application', adminConsentRequired: false }),
    { ...metadata, permissionCount: 0, definitionCount: 0, items: [] });
  assert.deepEqual(await client.permissions(resourceId, { q: 'UNIQUE USER CONSENT TITLE' }), {
    ...metadata, permissionCount: 1, definitionCount: 1,
    items: [{ ...item, visibleTypes: ['Delegated'], definitions: [user] }]
  });
  assert.deepEqual(await client.categories(resourceId, { q: disabledId }), {
    ...metadata, permissionCount: 0, definitionCount: 0, items: []
  });
  await assert.rejects(client.detail(resourceId, value.toLowerCase()), { code: 'not-found' });
  await assert.rejects(client.categories(absentResourceId), { code: 'not-found' });
  await assert.rejects(client.permissions(absentResourceId), { code: 'not-found' });
  await client.load();
  assert.deepEqual(calls.map(({ file }) => file), ['current.json', files.manifest.snapshot]);
});

test('consumer edits to query results cannot change the pinned publication', async () => {
  const { client, calls } = clientFor();
  const resources = await client.resources();
  const categories = await client.categories(resourceId);
  const list = await client.permissions(resourceId);
  const detail = await client.detail(resourceId, value);
  const expected = structuredClone({ resources, categories, list, detail });

  resources.items[0].displayName = 'Changed resource';
  resources.source.fileName = 'changed-source.json';
  categories.items[0].displayName = 'Changed category';
  list.items[0].definitions[0].title = 'Changed application title';
  list.artifact.version = 'changed-version';
  detail.item.definitions[0].title = 'Changed detail title';
  detail.allDefinitions.at(-1).userConsentTitle = 'Changed user consent title';

  assert.deepEqual(await client.resources(), expected.resources);
  assert.deepEqual(await client.categories(resourceId), expected.categories);
  assert.deepEqual(await client.permissions(resourceId), expected.list);
  assert.deepEqual(await client.detail(resourceId, value), expected.detail);
  assert.equal(calls.length, 2);
});

test('a valid zero-resource publication is pinned as ready', async () => {
  const version = 'a' + 'x'.repeat(79);
  const data = { ...snapshot(version), resources: [] };
  const { client, calls } = clientFor(publication(data));
  await client.load();
  const result = await client.resources();
  assert.equal(client.state, 'ready');
  assert.deepEqual(result.items, []);
  assert.equal(result.dataState, 'ready');
  assert.deepEqual(result.source, data.source);
  assert.equal(result.artifact.version, version);
  assert.equal(calls.length, 2);
});

test('JSON client rejects invalid and out-of-directory manifest references before reading a snapshot', async t => {
  const modifications = [
    ['array', () => []],
    ['missing snapshot', ({ snapshot: omitted, ...rest }) => rest],
    ['wrong version type', manifest => ({ ...manifest, version: 1 })],
    ['unsupported schema', manifest => ({ ...manifest, schemaVersion: 2 }), 'unsupported-schema'],
    ['invalid schema type', manifest => ({ ...manifest, schemaVersion: '1' })],
    ['oversize version', manifest => ({ ...manifest, version: 'x'.repeat(81) })],
    ['uppercase digest', manifest => ({ ...manifest, artifactSha256: manifest.artifactSha256.toUpperCase() })],
    ['unknown field', manifest => ({ ...manifest, unrecognized: true })],
    ...['https://example.invalid/catalog-test-v1.json', '/catalog-test-v1.json',
      'other/catalog-test-v1.json', '../catalog-test-v1.json', 'catalog-test-v1.json?download',
      '%2e%2e%2fcatalog-test-v1.json', 'catalog-another.json'].map(path =>
      [path, manifest => ({ ...manifest, snapshot: path })])
  ];
  for (const [name, modify, code = 'invalid-snapshot'] of modifications) {
    await t.test(name, async () => {
      const files = publication();
      files.manifest = modify(files.manifest);
      const { client, calls } = clientFor(files);
      await assert.rejects(client.resources(), { code });
      assert.equal(client.state, 'idle');
      assert.deepEqual(calls.map(({ file }) => file), ['current.json']);
    });
  }
});

test('manifest byte limit includes whitespace and applies to bodies without Content-Length', { timeout: 4000 }, async t => {
  const files = publication();
  const manifest = new TextEncoder().encode(JSON.stringify(files.manifest));
  const padding = new Uint8Array(JSON_MANIFEST_MAX_BYTES - manifest.byteLength).fill(0x20);
  for (const extraByte of [false, true]) {
    await t.test(extraByte ? 'one byte over limit' : 'exact limit', async () => {
      const calls = [];
      let cancelled = false;
      const client = new JsonCatalogClient(async file => {
        calls.push(file);
        if (file !== 'current.json') return fileResponse(files, file);
        return new Response(new ReadableStream({
          start(controller) {
            controller.enqueue(manifest);
            controller.enqueue(padding);
            if (extraByte) controller.enqueue(Uint8Array.of(0x20));
            else controller.close();
          },
          cancel() { cancelled = true; }
        }), { headers: { 'Content-Type': 'application/json' } });
      });
      if (extraByte) {
        await assert.rejects(client.load(), { code: 'invalid-snapshot' });
        assert.equal(cancelled, true);
        assert.deepEqual(calls, ['current.json']);
      } else {
        await client.load();
        assert.deepEqual(calls, ['current.json', files.manifest.snapshot]);
      }
    });
  }
});

test('JSON client rejects invalid snapshot structures even when their digest matches', async t => {
  const modifications = [
    ['unsupported schema', data => { data.schemaVersion = 2; }, 'unsupported-schema'],
    ['classification digest', data => { data.classificationHash = 'bad'; }],
    ['source traversal', data => { data.source.fileName = '../example-source.json'; }],
    ['source invalid timestamp', data => { data.source.generatedAt = '2026-02-30T00:00:00Z'; }],
    ['source unknown field', data => { data.source.importedAt = data.source.generatedAt; }],
    ['resources object', data => { data.resources = {}; }],
    ['resource unknown field', (_, resource) => { resource.unrecognized = true; }],
    ['resource GUID', (_, resource) => { resource.resourceId = 'bad'; }],
    ['duplicate resource', (data, resource) => { data.resources.push(resource); }],
    ['duplicate category', (_, resource) => { resource.categories.push(resource.categories[0]); }],
    ['duplicate family', (_, resource) => { resource.families.push(resource.families[0]); }],
    ['family without category', (_, resource) => { resource.families[0].category = 'absent'; }],
    ['definition without family', (_, __, entry) => { entry.family = 'Absent'; }],
    ['duplicate definition identity under another value', (_, resource, entry) => {
      const duplicate = structuredClone(entry);
      duplicate.value = 'Example.Other';
      duplicate.rawDefinition.value = duplicate.value;
      resource.definitions.push(duplicate);
    }],
    ['unknown raw field', (_, __, entry) => { entry.rawDefinition.unrecognized = true; }],
    ['raw value mismatch', (_, __, entry) => { entry.rawDefinition.value = 'Other.Read'; }],
    ['raw enabled mismatch', (_, __, entry) => { entry.rawDefinition.isEnabled = false; }],
    ['raw member type', (_, __, entry) => { entry.rawDefinition.allowedMemberTypes = ['User']; }],
    ['raw title mismatch', (_, __, entry) => { entry.rawDefinition.displayName = 'Different title'; }],
    ['delegated consent mismatch', (_, resource) => { resource.definitions[1].rawDefinition.type = 'Admin'; }],
    ['inconsistent same-value family', (_, resource, entry) => {
      resource.families.push({ category: category.category, family: 'Other' });
      entry.family = 'Other';
    }]
  ];
  for (const [name, modify, code = 'invalid-snapshot'] of modifications) {
    await t.test(name, async () => {
      const data = snapshot();
      const [resource] = data.resources;
      modify(data, resource, resource.definitions[0]);
      const { client, calls } = clientFor(publication(data));
      await assert.rejects(client.load(), { code });
      assert.equal(client.state, 'idle');
      assert.equal(calls.length, 2);
    });
  }
});

test('JSON client verifies exact file bytes and publication version independently', async t => {
  await t.test('same JSON reserialized to different bytes', async () => {
    const files = publication();
    files.bytes = JSON.stringify(JSON.parse(files.bytes));
    await assert.rejects(clientFor(files).client.resources(), { code: 'invalid-snapshot' });
  });
  await t.test('snapshot bytes pass digest but name and manifest identify another version', async () => {
    const files = publication();
    files.manifest.version = 'other-version';
    files.manifest.snapshot = 'catalog-other-version.json';
    await assert.rejects(clientFor(files).client.resources(), { code: 'invalid-snapshot' });
  });
});

test('JSON client classifies read failures and can retry after each failure', async t => {
  const files = publication();
  const cases = [
    ['network', () => { throw new TypeError('Synthetic network failure'); }, 'load-failed'],
    ['forbidden', () => new Response(null, { status: 403 }), 'permission-denied'],
    ['unauthenticated', () => new Response(null, { status: 401 }), 'permission-denied'],
    ['missing file', () => new Response(null, { status: 404 }), 'file-not-found'],
    ['temporary failure', () => new Response(null, { status: 503 }), 'load-failed'],
    ['login HTML', () => new Response('<!doctype html><title>Sign in</title>',
      { headers: { 'Content-Type': 'text/html' } }), 'load-failed'],
    ['HTML labeled as JSON', () => new Response('<html><title>Sign in</title>',
      { headers: { 'Content-Type': 'application/json' } }), 'load-failed'],
    ['malformed JSON', () => new Response('{"schemaVersion":', { headers: { 'Content-Type': 'application/json' } }),
      'invalid-snapshot']
  ];
  for (const [name, fail, code] of cases) {
    await t.test(name, async () => {
      let failing = true;
      const client = new JsonCatalogClient(async file => failing ? fail() : fileResponse(files, file));
      await assert.rejects(client.load(), { code });
      assert.equal(client.state, 'idle');
      failing = false;
      await client.load();
      assert.equal((await client.resources()).artifact.version, files.manifest.version);
    });
  }
});

test('concurrent initialization shares a single read and independent cancellation', { timeout: 4000 }, async () => {
  const files = publication();
  const requested = Promise.withResolvers();
  const response = Promise.withResolvers();
  const calls = [];
  const client = new JsonCatalogClient(async (file, signal) => {
    calls.push(file);
    if (file !== 'current.json') return fileResponse(files, file);
    requested.resolve(signal);
    return response.promise;
  });
  const cancel = new AbortController();
  const first = client.resources(cancel.signal);
  const second = client.permissions(resourceId);
  const signal = await requested.promise;
  assert.equal(client.state, 'loading');
  const rejection = assert.rejects(first, { name: 'AbortError' });
  cancel.abort();
  await rejection;
  assert.equal(signal.aborted, false);
  response.resolve(fileResponse(files, 'current.json'));
  assert.equal((await second).definitionCount, 3);
  assert.equal(client.state, 'ready');
  assert.deepEqual(calls, ['current.json', files.manifest.snapshot]);
});

test('a pre-aborted request does not start a load or return pinned data', async () => {
  const { client, calls } = clientFor();
  const signal = AbortSignal.abort();
  await assert.rejects(client.resources(signal), { name: 'AbortError' });
  assert.equal(calls.length, 0);
  assert.equal(client.state, 'idle');

  await client.load();
  await assert.rejects(client.permissions(resourceId, {}, signal), { name: 'AbortError' });
  await assert.rejects(client.refresh(signal), { name: 'AbortError' });
  assert.equal(calls.length, 2);
  assert.equal(client.state, 'ready');
});

test('last cancellation permits immediate retry while an abandoned response is still pending', { timeout: 4000 }, async () => {
  const older = publication(snapshot('older'));
  const newer = publication(snapshot('newer'));
  const requested = Promise.withResolvers();
  const abandoned = Promise.withResolvers();
  const released = Promise.withResolvers();
  const calls = [];
  const client = new JsonCatalogClient(async (file, signal) => {
    calls.push(file);
    if (calls.length === 1) return fileResponse(older, file);
    if (file === older.manifest.snapshot) {
      requested.resolve(signal);
      return abandoned.promise;
    }
    return fileResponse(newer, file);
  });
  const cancel = new AbortController();
  const first = client.load(cancel.signal);
  const signal = await requested.promise;
  const rejection = assert.rejects(first, { name: 'AbortError' });
  cancel.abort();
  await rejection;
  assert.equal(signal.aborted, true);
  assert.equal(client.state, 'idle');

  try {
    await client.load();
    assert.equal((await client.resources()).artifact.version, 'newer');
  } finally {
    abandoned.resolve(new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(older.bytes));
        controller.close();
      },
      cancel() { released.resolve(); }
    })));
  }
  await released.promise;
  assert.equal((await client.resources()).artifact.version, 'newer');
  assert.deepEqual(calls, ['current.json', older.manifest.snapshot, 'current.json', newer.manifest.snapshot]);
});

test('refreshes share work, preserve a pinned version until validated, and support rollback', { timeout: 4000 }, async () => {
  const original = publication(snapshot('original'));
  const update = publication(snapshot('update'));
  const requested = Promise.withResolvers();
  const candidate = Promise.withResolvers();
  let current = original;
  let holdUpdate = true;
  const calls = [];
  const client = new JsonCatalogClient(async file => {
    calls.push(file);
    if (file === update.manifest.snapshot && holdUpdate) {
      requested.resolve();
      return candidate.promise;
    }
    return fileResponse(current, file);
  });
  await client.load();
  current = update;
  const left = client.refresh();
  const right = client.refresh();
  await requested.promise;
  assert.equal(client.state, 'refreshing');
  assert.equal((await client.resources()).artifact.version, 'original');
  candidate.resolve(fileResponse(update, update.manifest.snapshot));
  await Promise.all([left, right]);
  assert.equal(client.state, 'ready');
  assert.equal((await client.resources()).artifact.version, 'update');
  assert.deepEqual(calls, ['current.json', original.manifest.snapshot, 'current.json', update.manifest.snapshot]);

  holdUpdate = false;
  current = { ...original, bytes: original.bytes + ' ' };
  await assert.rejects(client.refresh(), { code: 'invalid-snapshot' });
  assert.equal(client.state, 'ready');
  assert.equal((await client.resources()).artifact.version, 'update');

  current = original;
  await client.refresh();
  assert.equal((await client.resources()).artifact.version, 'original');
});

test('cancelled refresh keeps the current publication and a subsequent refresh can succeed', { timeout: 4000 }, async () => {
  const original = publication(snapshot('original'));
  const update = publication(snapshot('update'));
  const requested = Promise.withResolvers();
  const candidate = Promise.withResolvers();
  let current = original;
  let holdUpdate = true;
  const client = new JsonCatalogClient(async (file, signal) => {
    if (file === update.manifest.snapshot && holdUpdate) {
      requested.resolve(signal);
      return candidate.promise;
    }
    return fileResponse(current, file);
  });
  await client.load();
  current = update;
  const cancel = new AbortController();
  const refresh = client.refresh(cancel.signal);
  const signal = await requested.promise;
  const rejection = assert.rejects(refresh, { name: 'AbortError' });
  cancel.abort();
  await rejection;
  assert.equal(signal.aborted, true);
  assert.equal(client.state, 'ready');
  assert.equal((await client.resources()).artifact.version, 'original');

  holdUpdate = false;
  try {
    await client.refresh();
    assert.equal((await client.resources()).artifact.version, 'update');
  } finally {
    candidate.resolve(fileResponse(update, update.manifest.snapshot));
  }
});
