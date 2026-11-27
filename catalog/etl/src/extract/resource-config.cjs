/** 读取本地 resource 清单，校验源文件标识、摘要和可选的 category 分类规则。 */
const { resolve, dirname } = require('node:path');
const { readFile } = require('node:fs/promises');

const DEFAULT_CONFIG = resolve(__dirname, '../../../../data/catalog-resources.json');
const GRAPH_APP_ID = '00000003-0000-0000-c000-000000000000';
const GRAPH_FILE_NAME = 'commercial-graph-permlist.json';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIGEST = /^[a-f0-9]{64}$/i;
const FILE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,122}\.json$/;

/** 校验数据和配置的断言。消息只包含字段名称和固定说明。 */
function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

/** 可显示的目录名称或标识。限制长度，并拒绝控制字符和空值。 */
function isLabel(value) {
  return typeof value === 'string' && value.length <= 256 && value.trim().length > 0 && !/[\x00-\x1f\x7f]/.test(value);
}

/** 配置对象校验。只接受当前契约中列出的字段。 */
function requireFields(value, fields, message) {
  requireCondition(value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).every(key => fields.includes(key)), message);
}

/** 可选分类规则的校验函数。一个 family 在同一 resource 中最多配置一个 category。 */
function validateClassification(classification, appId) {
  if (classification === undefined) return;
  requireFields(classification, ['mode', 'version', 'categories'], 'Invalid resource classification.');
  const { mode, version, categories } = classification;
  if (mode === 'graph') {
    requireCondition(appId === GRAPH_APP_ID && Object.keys(classification).length === 1,
      'Built-in Graph classification requires the Microsoft Graph resource App ID.');
    return;
  }
  requireCondition(mode === 'categories' && typeof version === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(version)
    && Array.isArray(categories) && categories.length > 0 && categories.length < 256, 'Invalid category classification rules.');
  const usedCategories = new Set(['uncategorized', 'all-permissions']);
  const usedFamilies = new Set();
  for (const entry of categories) {
    requireFields(entry, ['category', 'displayName', 'description', 'families'], 'Invalid category configuration.');
    const { category, displayName, description, families } = entry;
    requireCondition(typeof category === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(category)
      && !usedCategories.has(category) && isLabel(displayName) && typeof description === 'string'
      && description.length <= 8192 && Array.isArray(families) && families.length > 0, 'Invalid or duplicate category configuration.');
    usedCategories.add(category);
    for (const family of families) {
      requireCondition(isLabel(family) && !usedFamilies.has(family), 'Invalid or duplicate family classification.');
      usedFamilies.add(family);
    }
  }
}

/** 文件 JSON 读取函数。拒绝损坏的 UTF-8，错误说明不回显本机路径或文件片段。 */
async function readJsonInput(file, label) {
  let bytes;
  try {
    bytes = await readFile(file);
  } catch (error) {
    throw new Error(`Cannot read ${label}. Check the configured sanitized JSON file and file access.`, { cause: error });
  }
  /** 将已读取的原始字节解码为 JSON，供调用方先校验摘要再解析。 */
  function parse() {
    try {
      return JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes));
    } catch {
      throw new Error(`Invalid JSON or UTF-8 in ${label}.`);
    }
  }
  return { bytes, parse };
}

/** resource 清单的加载函数。源文件名相对于清单目录，以 App ID 和文件名识别重复条目。 */
async function loadResourceConfig(path = DEFAULT_CONFIG) {
  const configPath = resolve(path);
  const { parse } = await readJsonInput(configPath, 'resource configuration');
  const config = parse();
  requireFields(config, ['resources'], 'Invalid resource configuration.');
  requireCondition(Array.isArray(config.resources) && config.resources.length > 0 && config.resources.length <= 32,
    'Resource configuration requires 1–32 resources.');
  const ids = new Set();
  const files = new Set();
  return config.resources.map(entry => {
    requireFields(entry, ['appId', 'fileName', 'sha256', 'displayName', 'classification'], 'Invalid configured resource.');
    const { appId, fileName, sha256, displayName, classification } = entry;
    requireCondition(typeof appId === 'string' && UUID.test(appId), 'Configured resource App ID must be a UUID.');
    requireCondition(typeof fileName === 'string' && FILE_NAME.test(fileName), 'Configured source must be a local JSON filename.');
    requireCondition(typeof sha256 === 'string' && DIGEST.test(sha256), 'Configured SHA256 must be a 64-character hex digest.');
    requireCondition(displayName === undefined || isLabel(displayName), 'Invalid configured resource display name.');
    const id = appId.toLowerCase();
    requireCondition(!ids.has(id) && !files.has(fileName.toLowerCase()), 'Duplicate resource App ID or source filename.');
    ids.add(id);
    files.add(fileName.toLowerCase());
    validateClassification(classification, id);
    return { ...entry, appId: id, sourcePath: resolve(dirname(configPath), fileName) };
  });
}

module.exports = { DEFAULT_CONFIG, GRAPH_APP_ID, GRAPH_FILE_NAME, UUID, DIGEST, isLabel, requireCondition, readJsonInput, loadResourceConfig };
