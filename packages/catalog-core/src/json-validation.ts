/** 校验 current.json 和它指向的目录快照。离线工具与浏览器都用同一套 schema 1 规则检查文件。 */
import type {
  CatalogJsonClientError, CatalogJsonClientErrorCode, CatalogJsonManifest, CatalogJsonSnapshot
} from '@graph/contracts';

/** current.json 的固定文件名，loader 从前端配置的同一目录读取此文件和它指向的快照。 */
export const JSON_MANIFEST_FILE = 'current.json';

/** 浏览器和离线校验共同使用的文件读取上限，单位为字节。 */
export const JSON_MANIFEST_MAX_BYTES = 4096;
export const JSON_SNAPSHOT_MAX_BYTES = 16 * 1024 * 1024;

const MAX_RESOURCES = 32;
const MAX_CATEGORIES_PER_RESOURCE = 256;
const MAX_FAMILIES_PER_RESOURCE = 2048;
const MAX_DEFINITIONS = 20_000;
const MAX_IDENTIFIER = 256;
const MAX_OFFICIAL_TEXT = 8192;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const RAW_UUID = new RegExp(UUID.source, 'i');
const SHA256 = /^[0-9a-f]{64}$/;
const VERSION = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
const LOGICAL_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,122}\.json$/;
const CLASSIFICATION_VERSION = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/;
const CATEGORY = /^[a-z0-9][a-z0-9-]{0,79}$/;
const DEFINITION_FIELDS = ['id', 'isEnabled', 'title', 'description', 'permissionType', 'adminConsentRequired', 'adminConsentRule'];
const RAW_FIELDS = ['id', 'value', 'isEnabled'];

/** JSON 目录的可识别错误；code 区分读取、校验和查询失败，消息不回显文件内容。 */
export class JsonCatalogError extends Error implements CatalogJsonClientError {
  /** JSON 错误的构造函数，接收稳定分类和可展示的英文说明。 */
  constructor(readonly code: CatalogJsonClientErrorCode, message: string) {
    super(message);
    this.name = 'JsonCatalogError';
  }
}

/** 检查 ISO UTC 时间格式和日期。例如 2 月 30 日可能被 Date 转成 3 月，校验会拒绝这种输入。 */
export function isJsonTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false;
  const instant = new Date(value);
  return Number.isFinite(instant.valueOf())
    && instant.toISOString() === (value.length === 20 ? value.replace('Z', '.000Z') : value);
}

/** JSON schema 的断言函数；条件不成立时报告固定说明，避免输出未经校验的值。 */
function expect(condition: unknown, description: string): asserts condition {
  if (!condition) throw new JsonCatalogError('invalid-snapshot', description);
}

/** 发布文件的 UTF-8 解码函数，拒绝过大文件、无效编码和伪装为成功响应的 HTML。 */
function decode(bytes: Uint8Array, maxBytes: number): string {
  expect(bytes.byteLength <= maxBytes, 'Catalog file exceeds the byte limit.');
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new JsonCatalogError('invalid-snapshot', 'Catalog file is not valid UTF-8.');
  }
  if (text.trimStart().startsWith('<')) {
    throw new JsonCatalogError('load-failed', 'Catalog file returned HTML instead of JSON.');
  }
  return text;
}

/** schema 1 的顶层 JSON 对象解析函数，区分不支持的版本和缺失或无效的 schema 字段。 */
function parseDocument(text: string, fields: readonly string[]): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new JsonCatalogError('invalid-snapshot', 'Catalog file is not valid JSON.');
  }
  if (value && typeof value === 'object' && 'schemaVersion' in value
    && Number.isInteger(value.schemaVersion) && value.schemaVersion !== 1) {
    throw new JsonCatalogError('unsupported-schema', 'Catalog schema version is not supported.');
  }
  const document = record(value, fields);
  expect(document.schemaVersion === 1, 'Invalid catalog schema version.');
  return document;
}

/** JSON 对象的字段校验函数；每一层只允许契约列出的自有字段。 */
function record(value: unknown, fields: readonly string[]): Record<string, unknown> {
  expect(value !== null && typeof value === 'object' && !Array.isArray(value), 'Expected a catalog object.');
  expect(Object.keys(value).length === fields.length && fields.every(field => Object.prototype.hasOwnProperty.call(value, field)),
    'Catalog object has missing or unsupported fields.');
  return value as Record<string, unknown>;
}

/** JSON 数组的校验函数，在继续访问元素前限制集合大小。 */
function array(value: unknown, maxLength: number): unknown[] {
  expect(Array.isArray(value) && value.length <= maxLength, 'Invalid catalog collection or record limit exceeded.');
  return value;
}

/** 官方文案的校验函数，允许空文案与换行，限制单个字段长度。 */
function officialText(value: unknown): string {
  expect(typeof value === 'string' && value.length <= MAX_OFFICIAL_TEXT, 'Invalid official text field.');
  return value;
}

/** value、family 等名称的校验函数，允许英文标签中的空格，拒绝空名称或控制字符。 */
function label(value: unknown): string {
  expect(typeof value === 'string' && value.length <= MAX_IDENTIFIER && value.trim()
    && !/[\u0000-\u001f\u007f]/.test(value), 'Invalid catalog name.');
  return value;
}

/** 版本、GUID 和摘要等字段的校验函数，要求值符合相应的完整格式。 */
function pattern(value: unknown, regex: RegExp): string {
  expect(typeof value === 'string' && regex.test(value), 'Invalid catalog identifier or digest.');
  return value;
}

/** 从 current.json 取得快照文件名和摘要。版本为 v1 时，文件名必须是同一目录中的 catalog-v1.json。 */
export function readJsonManifest(bytes: Uint8Array): CatalogJsonManifest {
  const manifest = parseDocument(decode(bytes, JSON_MANIFEST_MAX_BYTES), ['schemaVersion', 'version', 'snapshot', 'artifactSha256']);
  const version = pattern(manifest.version, VERSION);
  expect(manifest.snapshot === `catalog-${version}.json`, 'Catalog manifest must reference its versioned filename.');
  pattern(manifest.artifactSha256, SHA256);
  return manifest as unknown as CatalogJsonManifest;
}

/** 发布来源的校验函数，确保摘要、时间、逻辑文件名和排除数量可用于追溯。 */
function validateSource(value: unknown): void {
  const source = record(value, ['fileName', 'sha256', 'classificationVersion', 'generatedAt', 'excludedRscCount']);
  pattern(source.fileName, LOGICAL_FILENAME);
  pattern(source.sha256, SHA256);
  pattern(source.classificationVersion, CLASSIFICATION_VERSION);
  expect(isJsonTimestamp(source.generatedAt), 'Catalog generation timestamp must be ISO UTC.');
  expect(typeof source.excludedRscCount === 'number' && Number.isSafeInteger(source.excludedRscCount)
    && source.excludedRscCount >= 0, 'Invalid excluded RSC count.');
}

/** 核对一条普通 definition 的导航和字段。同一 value 共用导航位置，界面文案和 consent 规则必须与原始字段对应。 */
function validateDefinition(value: unknown, families: ReadonlyMap<string, Set<string>>,
  identities: Set<string>, locations: Map<string, string>): void {
  const entry = record(value, ['value', 'category', 'family', 'definition', 'rawDefinition']);
  const permissionValue = label(entry.value);
  const category = pattern(entry.category, CATEGORY);
  const family = label(entry.family);
  expect(families.get(category)?.has(family), 'Permission references an unknown category or family.');
  const location = JSON.stringify([category, family]);
  expect((locations.get(permissionValue) ?? location) === location, 'A permission value must have one category and family.');
  locations.set(permissionValue, location);

  // Application 的原始字段来自 appRole，Delegated 来自 scope。识别类型后分别检查它们的字段。
  const permissionType = entry.definition && typeof entry.definition === 'object' && 'permissionType' in entry.definition
    ? entry.definition.permissionType : undefined;
  expect(permissionType === 'Application' || permissionType === 'Delegated', 'Invalid ordinary permission type.');
  const delegated = permissionType === 'Delegated';
  const definition = record(entry.definition, delegated
    ? [...DEFINITION_FIELDS, 'consentType', 'userConsentTitle', 'userConsentDescription'] : DEFINITION_FIELDS);
  const raw = record(entry.rawDefinition, delegated
    ? [...RAW_FIELDS, 'type', 'adminConsentDisplayName', 'adminConsentDescription', 'userConsentDisplayName', 'userConsentDescription']
    : [...RAW_FIELDS, 'allowedMemberTypes', 'origin', 'displayName', 'description']);
  const id = pattern(definition.id, UUID);
  expect(pattern(raw.id, RAW_UUID).toLowerCase() === id
    && raw.value === permissionValue && typeof definition.isEnabled === 'boolean'
    && raw.isEnabled === definition.isEnabled, 'Original and normalized permission fields disagree.');
  const identity = `${permissionType}/${id}`;
  expect(!identities.has(identity), 'Duplicate permission definition identity.');
  identities.add(identity);

  if (delegated) {
    expect((raw.type === 'Admin' || raw.type === 'User') && definition.consentType === raw.type
      && definition.adminConsentRequired === (raw.type === 'Admin') && definition.adminConsentRule === 'delegated-consent-type'
      && definition.title === officialText(raw.adminConsentDisplayName)
      && definition.description === officialText(raw.adminConsentDescription)
      && definition.userConsentTitle === officialText(raw.userConsentDisplayName)
      && definition.userConsentDescription === officialText(raw.userConsentDescription),
    'Original and normalized Delegated fields disagree.');
  } else {
    const members = array(raw.allowedMemberTypes, 32);
    expect(members.includes('Application') && members.every(member => member === 'User' || member === 'Application')
      && (raw.origin === 'Application' || raw.origin === 'ServicePrincipal')
      && definition.adminConsentRequired === true && definition.adminConsentRule === 'application-always-required'
      && definition.title === officialText(raw.displayName) && definition.description === officialText(raw.description),
    'Original and normalized Application fields disagree.');
  }
}

/** 单个 resource 的结构校验函数，对定义应用快照剩余的记录预算并返回实际记录数。 */
function validateResource(value: unknown, resourceIds: Set<string>, remainingDefinitions: number): number {
  const resource = record(value, ['resourceId', 'displayName', 'categories', 'families', 'definitions']);
  const id = pattern(resource.resourceId, UUID);
  expect(!resourceIds.has(id), 'Duplicate resource App ID.');
  resourceIds.add(id);
  label(resource.displayName);

  const families = new Map<string, Set<string>>();
  for (const value of array(resource.categories, MAX_CATEGORIES_PER_RESOURCE)) {
    const category = record(value, ['category', 'displayName', 'description']);
    const key = pattern(category.category, CATEGORY);
    expect(!families.has(key), 'Duplicate category identifier.');
    label(category.displayName);
    officialText(category.description);
    families.set(key, new Set());
  }
  for (const value of array(resource.families, MAX_FAMILIES_PER_RESOURCE)) {
    const family = record(value, ['category', 'family']);
    const names = families.get(pattern(family.category, CATEGORY));
    const name = label(family.family);
    expect(names && !names.has(name), 'Duplicate family or unknown category reference.');
    names.add(name);
  }

  const identities = new Set<string>();
  const locations = new Map<string, string>();
  // 同名可以有多条定义。用类型和 GUID 识别重复定义，用 value 核对它们是否出现在同一个位置。
  const definitions = array(resource.definitions, remainingDefinitions);
  for (const definition of definitions) validateDefinition(definition, families, identities, locations);
  return definitions.length;
}

/** 读取清单指定的快照。先按文件字节核对 SHA-256，再检查版本、字段和引用，全部通过才返回目录数据。 */
export async function readJsonSnapshot(bytes: Uint8Array, manifest: CatalogJsonManifest): Promise<CatalogJsonSnapshot> {
  const text = decode(bytes, JSON_SNAPSHOT_MAX_BYTES);
  // 解码只用于识别 UTF-8 和 HTML；摘要始终对应传入的原始字节。
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  expect(sha256 === manifest.artifactSha256, 'Catalog snapshot SHA-256 does not match the manifest.');
  const snapshot = parseDocument(text, ['schemaVersion', 'version', 'source', 'classificationHash', 'resources']);
  expect(snapshot.version === manifest.version, 'Catalog snapshot version does not match the manifest.');
  pattern(snapshot.classificationHash, SHA256);
  validateSource(snapshot.source);

  const resourceIds = new Set<string>();
  let remaining = MAX_DEFINITIONS;
  // 上限约束的是整个文件。校验完一个 resource 后，扣掉它已使用的条数。
  for (const resource of array(snapshot.resources, MAX_RESOURCES)) {
    remaining -= validateResource(resource, resourceIds, remaining);
  }
  return snapshot as unknown as CatalogJsonSnapshot;
}
