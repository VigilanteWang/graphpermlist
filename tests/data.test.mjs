import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPermissionsSource, validatePermissionsData } from '../scripts/verify-data.mjs';

test('versioned snapshot digest verifies all collections; partial and missing sources fail', async () => {
  const { data, counts } = await loadPermissionsSource({ source: undefined });
  assert.equal(counts.applicationPermissions, data.appRoles.length);
  assert.equal(counts.oauth2PermissionScopes.total, data.oauth2PermissionScopes.length);
  assert.throws(() => validatePermissionsData({ ...data, oauth2PermissionScopes: [] }), /partial import/);
  assert.throws(() => validatePermissionsData({ ...data, passwordCredentials: [] }), /sanitize/);
  await assert.rejects(loadPermissionsSource({ source: 'tests/missing-input.json' }), /Cannot read permissions input/);
  await assert.rejects(loadPermissionsSource({ expectedSha256: '0'.repeat(64) }), /SHA256 mismatch/);
});
