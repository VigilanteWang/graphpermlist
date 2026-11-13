import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DEFAULT_PERMISSIONS_SOURCE = fileURLToPath(
  new URL('../data/commercial-graph-permlist.json', import.meta.url),
);
export const SNAPSHOT_SHA256 = 'd566bed3c4d7a4cf09ec54d35c25aee7b232df5b46c765af7a377dd9fe0b96a0';
const GRAPH_APP_ID = '00000003-0000-0000-c000-000000000000';
const COLLECTIONS = ['appRoles', 'oauth2PermissionScopes', 'resourceSpecificApplicationPermissions'];
const ROOT_KEYS = ['appId', 'appDisplayName', 'displayName', ...COLLECTIONS];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIELDS = {
  appRoles: ['allowedMemberTypes', 'description', 'displayName', 'id', 'isEnabled', 'origin', 'value'],
  oauth2PermissionScopes: ['adminConsentDescription', 'adminConsentDisplayName', 'id', 'isEnabled', 'type', 'userConsentDescription', 'userConsentDisplayName', 'value'],
  resourceSpecificApplicationPermissions: ['description', 'displayName', 'id', 'isEnabled', 'value'],
};

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

export function validatePermissionsData(data) {
  requireCondition(data !== null && typeof data === 'object' && !Array.isArray(data), 'Permissions input must be a JSON object.');
  requireCondition(data.appId === GRAPH_APP_ID, 'Permissions input must identify the Microsoft Graph resource appId.');
  for (const key of Object.keys(data)) {
    requireCondition(ROOT_KEYS.includes(key), `Unsupported root field "${key}"; sanitize tenant metadata and credentials before importing.`);
  }
  for (const key of ['appDisplayName', 'displayName']) {
    requireCondition(typeof data[key] === 'string' && data[key].trim().length > 0, `Missing resource field: ${key}.`);
  }
  const counts = {};
  for (const collection of COLLECTIONS) {
    const items = data[collection];
    requireCondition(Array.isArray(items) && items.length > 0, `Missing or empty permission collection: ${collection}; refusing a partial import.`);
    const ids = new Set();
    const values = new Set();
    for (const [index, item] of items.entries()) {
      const label = `${collection}[${index}]`;
      requireCondition(item !== null && typeof item === 'object' && !Array.isArray(item), `${label} must be an object.`);
      for (const key of Object.keys(item)) {
        requireCondition(FIELDS[collection].includes(key), `${label} has unsupported field "${key}"; review the schema before importing.`);
      }
      for (const field of FIELDS[collection]) {
        if (field === 'allowedMemberTypes') {
          requireCondition(Array.isArray(item[field]) && item[field].length > 0 && item[field].every(value => ['Application', 'User'].includes(value)), `${label}.allowedMemberTypes must contain valid member types.`);
        } else if (field === 'isEnabled') {
          requireCondition(typeof item[field] === 'boolean', `${label}.isEnabled must be a boolean.`);
        } else {
          requireCondition(typeof item[field] === 'string', `${label}.${field} must be a string.`);
        }
      }
      requireCondition(UUID.test(item.id), `${label}.id must be a UUID.`);
      requireCondition(item.value.trim().length > 0, `${label}.value must not be empty.`);
      requireCondition(!ids.has(item.id.toLowerCase()), `${collection} has duplicate permission id: ${item.id}.`);
      requireCondition(!values.has(item.value), `${collection} has duplicate permission value: ${item.value}.`);
      if (collection === 'appRoles') requireCondition(['Application', 'ServicePrincipal'].includes(item.origin), `${label}.origin is invalid.`);
      if (collection === 'oauth2PermissionScopes') requireCondition(['Admin', 'User'].includes(item.type), `${label}.type is invalid.`);
      ids.add(item.id.toLowerCase());
      values.add(item.value);
    }
    counts[collection] = { total: items.length, disabled: items.filter(item => !item.isEnabled).length };
  }
  counts.applicationPermissions = data.appRoles.filter(item => item.allowedMemberTypes.includes('Application')).length;
  return counts;
}

export async function loadPermissionsSource({ source = process.env.PERMISSIONS_SOURCE, expectedSha256 = process.env.PERMISSIONS_SHA256 } = {}) {
  const sourcePath = source ? path.resolve(source) : DEFAULT_PERMISSIONS_SOURCE;
  let bytes;
  try {
    bytes = await readFile(sourcePath);
  } catch (error) {
    throw new Error(`Cannot read permissions input "${source || 'data/commercial-graph-permlist.json'}": ${error.code || error.message}. Set PERMISSIONS_SOURCE to an existing sanitized JSON file.`, { cause: error });
  }
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  // The checked-in snapshot is pinned independently of its current row counts.
  const expected = expectedSha256 || (sourcePath === DEFAULT_PERMISSIONS_SOURCE ? SNAPSHOT_SHA256 : undefined);
  if (expected) {
    requireCondition(/^[a-f0-9]{64}$/i.test(expected), 'PERMISSIONS_SHA256 must be a 64-character SHA256 hex digest.');
    requireCondition(sha256 === expected.toLowerCase(), 'Permissions input SHA256 mismatch; refusing a changed or incomplete snapshot. Review and update the snapshot manifest intentionally.');
  }
  let data;
  try {
    data = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    throw new Error(`Permissions input is not valid JSON: ${error.message}`, { cause: error });
  }
  const counts = validatePermissionsData(data);
  return { data, sourcePath, sha256, counts };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const { sha256, counts } = await loadPermissionsSource();
    console.log(JSON.stringify({ status: 'ok', sha256, counts }, null, 2));
  } catch (error) {
    console.error(`Data verification failed: ${error.message}`);
    process.exitCode = 1;
  }
}
