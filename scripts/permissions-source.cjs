/** 为 SQLite 导入、JSON 导出和数据校验读取同一套本地 Graph permission 输入。 */
const { createHash } = require('node:crypto');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_PERMISSIONS_SOURCE = path.resolve(__dirname, '../data/commercial-graph-permlist.json');
const SNAPSHOT_SHA256 = 'd566bed3c4d7a4cf09ec54d35c25aee7b232df5b46c765af7a377dd9fe0b96a0';
const GRAPH_APP_ID = '00000003-0000-0000-c000-000000000000';
const COLLECTIONS = ['appRoles', 'oauth2PermissionScopes', 'resourceSpecificApplicationPermissions'];
const ROOT_KEYS = ['appId', 'appDisplayName', 'displayName', ...COLLECTIONS];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIELDS = {
  appRoles: ['allowedMemberTypes', 'description', 'displayName', 'id', 'isEnabled', 'origin', 'value'],
  oauth2PermissionScopes: ['adminConsentDescription', 'adminConsentDisplayName', 'id', 'isEnabled', 'type', 'userConsentDescription', 'userConsentDisplayName', 'value'],
  resourceSpecificApplicationPermissions: ['description', 'displayName', 'id', 'isEnabled', 'value'],
};

/**
 * 条件校验辅助函数；条件不满足时立即抛错，阻止继续导入。
 * @param {boolean} condition 需要满足的条件。
 * @param {string} message 校验失败时显示的信息。
 */
function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

/**
 * permission 文件的结构校验函数。确认文件对应 Microsoft Graph，再检查各类 definition 的字段并统计数量。
 * @param {unknown} data 从 JSON 解析得到、尚未校验的数据。
 * @returns {Record<string, unknown>} 各集合总数、禁用数量及 Application permission 数量。
 */
function validatePermissionsData(data) {
  requireCondition(data !== null && typeof data === 'object' && !Array.isArray(data), 'Permissions input must be a JSON object.');
  requireCondition(data.appId === GRAPH_APP_ID, 'Permissions input must identify the Microsoft Graph resource appId.');
  // 资源信息只接受允许列表中的字段，遇到额外字段就要求先清理源文件。
  for (const key of Object.keys(data)) {
    requireCondition(ROOT_KEYS.includes(key), `Unsupported root field "${key}"; sanitize tenant metadata and credentials before importing.`);
  }
  for (const key of ['appDisplayName', 'displayName']) {
    requireCondition(typeof data[key] === 'string' && data[key].trim().length > 0, `Missing resource field: ${key}.`);
  }
  const counts = {};
  for (const collection of COLLECTIONS) {
    // 三个集合必须同时存在且非空，避免导入缺失部分 permission 的快照。
    const items = data[collection];
    requireCondition(Array.isArray(items) && items.length > 0, `Missing or empty permission collection: ${collection}; refusing a partial import.`);
    const ids = new Set();
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
      // permission ID 必须有效；同一集合内按忽略大小写的方式检查重复。
      requireCondition(UUID.test(item.id), `${label}.id must be a UUID.`);
      requireCondition(item.value.trim().length > 0, `${label}.value must not be empty.`);
      requireCondition(!ids.has(item.id.toLowerCase()), `${collection} has duplicate permission id: ${item.id}.`);
      if (collection === 'appRoles') requireCondition(['Application', 'ServicePrincipal'].includes(item.origin), `${label}.origin is invalid.`);
      if (collection === 'oauth2PermissionScopes') requireCondition(['Admin', 'User'].includes(item.type), `${label}.type is invalid.`);
      ids.add(item.id.toLowerCase());
    }
    counts[collection] = { total: items.length, disabled: items.filter(item => !item.isEnabled).length };
  }
  // appRoles 可以允许 User、Application 或两者。这里只统计 allowedMemberTypes 包含 Application 的项。
  counts.applicationPermissions = data.appRoles.filter(item => item.allowedMemberTypes.includes('Application')).length;
  return counts;
}

/**
 * permission 文件的加载函数。从文件读取原始字节，检查摘要后再解码和校验 JSON。
 * @param {{source?: string, expectedSha256?: string}} [options] 文件路径和预期摘要，省略时从 PERMISSIONS_SOURCE 和 PERMISSIONS_SHA256 读取。
 * @returns {Promise<{data: object, sourcePath: string, sha256: string, counts: Record<string, unknown>}>} 已校验数据、文件路径、实际摘要及数量统计。
 */
async function loadPermissionsSource({ source = process.env.PERMISSIONS_SOURCE, expectedSha256 = process.env.PERMISSIONS_SHA256 } = {}) {
  const sourcePath = source ? path.resolve(source) : DEFAULT_PERMISSIONS_SOURCE;
  let bytes;
  try {
    bytes = await readFile(sourcePath);
  } catch (error) {
    throw new Error(`Cannot read permissions input "${source || 'data/commercial-graph-permlist.json'}": ${error.code || error.message}. Set PERMISSIONS_SOURCE to an existing sanitized JSON file.`, { cause: error });
  }
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  // 预期摘要优先取调用方或环境变量传入的值。仓库默认文件还可使用内置摘要，自定义文件没有这一默认值。
  const expected = expectedSha256 || (sourcePath === DEFAULT_PERMISSIONS_SOURCE ? SNAPSHOT_SHA256 : undefined);
  if (expected) {
    requireCondition(/^[a-f0-9]{64}$/i.test(expected), 'PERMISSIONS_SHA256 must be a 64-character SHA256 hex digest.');
    requireCondition(sha256 === expected.toLowerCase(), 'Permissions input SHA256 mismatch; refusing a changed or incomplete snapshot. Review and update the snapshot manifest intentionally.');
  }
  let data;
  try {
    // 拒绝损坏的 UTF-8，避免在官方文案中悄悄写入替代字符。
    data = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes));
  } catch (error) {
    throw new Error(`Permissions input is not valid JSON: ${error.message}`, { cause: error });
  }
  const counts = validatePermissionsData(data);
  return { data, sourcePath, sha256, counts };
}

module.exports = { DEFAULT_PERMISSIONS_SOURCE, SNAPSHOT_SHA256, validatePermissionsData, loadPermissionsSource };
