import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPermissionsSource, validatePermissionsData } from '@graph/catalog-source';

test('versioned snapshot digest verifies all collections; partial and missing sources fail', async () => {
  const { data, counts } = await loadPermissionsSource({ source: undefined });
  assert.equal(counts.applicationPermissions, data.appRoles.length);
  assert.equal(counts.oauth2PermissionScopes.total, data.oauth2PermissionScopes.length);
  assert.doesNotThrow(() => validatePermissionsData({ ...data, oauth2PermissionScopes: [] }));
  assert.throws(() => validatePermissionsData({ ...data, oauth2PermissionScopes: undefined }), /partial import/);
  assert.throws(() => validatePermissionsData({ ...data, oauth2PermissionScopes: [], appRoles: [] }), /ordinary definition/);
  assert.throws(() => validatePermissionsData({ ...data, passwordCredentials: [] }), /sanitize/);
  await assert.rejects(loadPermissionsSource({ source: 'tests/missing-input.json' }), /Cannot read permissions input/);
  await assert.rejects(loadPermissionsSource({ expectedSha256: '0'.repeat(64) }), /SHA256 mismatch/);
});
