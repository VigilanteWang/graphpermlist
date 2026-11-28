import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadPermissionsSources, validatePermissionsData } from '@graph/catalog-source';
import { writeGraphManifest } from './fixtures/graph-manifest.mjs';

test('versioned snapshot digest verifies all collections; partial and missing sources fail', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'catalog-data-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const configPath = await writeGraphManifest(dir);
  const [{ data, counts }] = await loadPermissionsSources({ configPath });
  assert.equal(counts.applicationPermissions, data.appRoles.length);
  assert.equal(counts.oauth2PermissionScopes.total, data.oauth2PermissionScopes.length);
  assert.doesNotThrow(() => validatePermissionsData({ ...data, oauth2PermissionScopes: [] }));
  assert.throws(() => validatePermissionsData({ ...data, oauth2PermissionScopes: undefined }), /partial import/);
  assert.throws(() => validatePermissionsData({ ...data, oauth2PermissionScopes: [], appRoles: [] }), /ordinary definition/);
  assert.throws(() => validatePermissionsData({ ...data, passwordCredentials: [] }), /sanitize/);
  const manifest = JSON.parse(await readFile(configPath));
  const [resource] = manifest.resources;
  resource.sha256 = '0'.repeat(64);
  await writeFile(configPath, JSON.stringify(manifest));
  await assert.rejects(loadPermissionsSources({ configPath }), /SHA256 mismatch/);
  resource.fileName = 'missing-input.json';
  await writeFile(configPath, JSON.stringify(manifest));
  await assert.rejects(loadPermissionsSources({ configPath }), /Cannot read permissions input/);
});

test('data verification returns a resources array for any manifest and rejects retired digest overrides', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'catalog-verify-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const configPath = await writeGraphManifest(dir);
  const verify = (path, extra = {}) => spawnSync(process.execPath, ['catalog/etl/src/extract/verify-data.mjs'], {
    env: { ...process.env, PERMISSIONS_CONFIG: path, PERMISSIONS_SOURCE: '', PERMISSIONS_SHA256: '', ...extra },
    encoding: 'utf8', timeout: 15000
  });
  for (const [path, expected] of [[configPath, 1], ['', 3]]) {
    const result = verify(path);
    assert.equal(result.status, 0, result.stderr);
    const { status, resources } = JSON.parse(result.stdout);
    assert.equal(status, 'ok');
    assert.equal(resources.length, expected);
  }
  const retired = verify(configPath, { PERMISSIONS_SHA256: '0'.repeat(64) });
  assert.equal(retired.status, 1);
  assert.match(retired.stderr, /Use PERMISSIONS_CONFIG/);
});
