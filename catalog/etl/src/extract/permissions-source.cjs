/** 为 SQLite 导入、JSON 导出和数据校验读取同一套经校验的本地 resource 输入。 */
const { createHash } = require('node:crypto');
const {
  GRAPH_APP_ID, UUID, isLabel, requireCondition, readJsonInput, loadResourceConfig
} = require('./resource-config.cjs');

const COLLECTIONS = ['appRoles', 'oauth2PermissionScopes', 'resourceSpecificApplicationPermissions'];
const ROOT_KEYS = ['appId', 'appDisplayName', 'displayName', ...COLLECTIONS];
const FIELDS = {
  appRoles: ['allowedMemberTypes', 'description', 'displayName', 'id', 'isEnabled', 'origin', 'value'],
  oauth2PermissionScopes: ['adminConsentDescription', 'adminConsentDisplayName', 'id', 'isEnabled', 'type', 'userConsentDescription', 'userConsentDisplayName', 'value'],
  resourceSpecificApplicationPermissions: ['description', 'displayName', 'id', 'isEnabled', 'value'],
};

/** 已退役的源配置错误。各命令可以直接显示这条固定的迁移提示。 */
class RetiredSourceOptionsError extends Error {
  /** 创建提示清理旧环境变量、改用资源清单的错误。 */
  constructor() {
    super('Unset PERMISSIONS_SOURCE and PERMISSIONS_SHA256. Use PERMISSIONS_CONFIG and set each source SHA256 in the resource manifest.');
  }
}

/**
 * permission 文件的结构校验函数。确认文件与配置中的 Resource App ID 一致，再检查各类 definition 的字段并统计数量。
 * @param {unknown} data 从 JSON 解析得到、尚未校验的数据。
 * @param {string} [appId] 预期的 Resource App ID。
 * @returns {Record<string, unknown>} 各集合总数、禁用数量及 Application permission 数量。
 */
function validatePermissionsData(data, appId = GRAPH_APP_ID) {
  requireCondition(data !== null && typeof data === 'object' && !Array.isArray(data), 'Permissions input must be a JSON object.');
  requireCondition(typeof appId === 'string' && UUID.test(appId) && typeof data.appId === 'string'
    && UUID.test(data.appId) && data.appId.toLowerCase() === appId.toLowerCase(),
  'Permissions input does not match the expected Resource App ID.');
  // 资源信息只接受允许列表中的字段，遇到额外字段就要求先清理源文件。
  requireCondition(Object.keys(data).every(key => ROOT_KEYS.includes(key)),
    'Unsupported source field; sanitize tenant metadata and credentials before importing.');
  for (const key of ['appDisplayName', 'displayName']) {
    requireCondition(isLabel(data[key]), `Missing resource field: ${key}.`);
  }
  const counts = {};
  for (const collection of COLLECTIONS) {
    // 三个集合都要明确提供。某个类型可以没有 definition，但不能把字段缺失当成空集合。
    const items = data[collection];
    requireCondition(Array.isArray(items), `Missing permission collection: ${collection}; refusing a partial import.`);
    const ids = new Set();
    for (const [index, item] of items.entries()) {
      const label = `${collection}[${index}]`;
      requireCondition(item !== null && typeof item === 'object' && !Array.isArray(item), `${label} must be an object.`);
      requireCondition(Object.keys(item).every(key => FIELDS[collection].includes(key)),
        `${label} has an unsupported field; review the schema before importing.`);
      for (const field of FIELDS[collection]) {
        if (field === 'allowedMemberTypes') {
          requireCondition(Array.isArray(item[field]) && item[field].length > 0 && item[field].length <= 32 && item[field].every(value => ['Application', 'User'].includes(value)), `${label}.allowedMemberTypes must contain valid member types.`);
        } else if (field === 'isEnabled') {
          requireCondition(typeof item[field] === 'boolean', `${label}.isEnabled must be a boolean.`);
        } else {
          requireCondition(typeof item[field] === 'string' && item[field].length <= 8192, `${label}.${field} must be a bounded string.`);
        }
      }
      // permission ID 必须有效；同一集合内按忽略大小写的方式检查重复。
      requireCondition(UUID.test(item.id), `${label}.id must be a UUID.`);
      requireCondition(isLabel(item.value) && isLabel(item.value.split('.')[0]), `${label}.value must be a valid permission name.`);
      requireCondition(!ids.has(item.id.toLowerCase()), `${collection} has a duplicate permission ID.`);
      if (collection === 'appRoles') requireCondition(['Application', 'ServicePrincipal'].includes(item.origin), `${label}.origin is invalid.`);
      if (collection === 'oauth2PermissionScopes') requireCondition(['Admin', 'User'].includes(item.type), `${label}.type is invalid.`);
      ids.add(item.id.toLowerCase());
    }
    counts[collection] = { total: items.length, disabled: items.filter(item => !item.isEnabled).length };
  }
  // appRoles 可以允许 User、Application 或两者。这里只统计 allowedMemberTypes 包含 Application 的项。
  counts.applicationPermissions = data.appRoles.filter(item => item.allowedMemberTypes.includes('Application')).length;
  requireCondition(counts.applicationPermissions + counts.oauth2PermissionScopes.total > 0,
    'Permissions input must contain at least one ordinary definition; refusing a partial import.');
  return counts;
}

/** 配置所指定的单份脱敏源。先核对原始字节摘要，再解析和校验 App ID 及 permission 字段。 */
async function loadFile(sourcePath, appId, expected, fileName) {
  const { bytes, parse } = await readJsonInput(sourcePath, 'permissions input');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  requireCondition(sha256 === expected.toLowerCase(), 'Permissions input SHA256 mismatch; check the approved source digest.');
  const data = parse();
  const counts = validatePermissionsData(data, appId);
  return { data: { ...data, appId: data.appId.toLowerCase() }, sourcePath, fileName, sha256, counts };
}

/** 目录输入加载函数，返回清单中全部已校验的源。 */
async function loadPermissionsSources({ configPath = process.env.PERMISSIONS_CONFIG } = {}) {
  // 旧环境配置必须先清理，避免原先只导入 Graph 的命令意外导入默认清单的全部 resource。
  if (process.env.PERMISSIONS_SOURCE || process.env.PERMISSIONS_SHA256) {
    throw new RetiredSourceOptionsError();
  }
  const entries = await loadResourceConfig(configPath || undefined);
  const inputs = [];
  for (const { appId, sourcePath, fileName, sha256, displayName, classification } of entries) {
    const input = await loadFile(sourcePath, appId, sha256, fileName);
    inputs.push({ ...input, displayName, classification });
  }
  return inputs;
}

/** 公开资源字段投影。同一白名单适用于三个集合，数组中的对象也需要经过校验。 */
function sanitizePermissionsData(data, appId) {
  /** 保留对象的白名单自有字段，交由源校验器检查必填字段和数据类型。 */
  function pick(value, fields) {
    requireCondition(value && typeof value === 'object' && !Array.isArray(value), 'Expected an object in the permissions export.');
    return Object.fromEntries(fields.filter(key => Object.hasOwn(value, key)).map(key => [key, value[key]]));
  }
  const output = pick(data, ROOT_KEYS);
  for (const collection of COLLECTIONS) {
    requireCondition(Array.isArray(output[collection]), 'Permissions export must include all three collections.');
    output[collection] = output[collection].map(entry => pick(entry, FIELDS[collection]));
  }
  validatePermissionsData(output, appId);
  return output;
}

module.exports = { RetiredSourceOptionsError, validatePermissionsData, loadPermissionsSources, sanitizePermissionsData };
