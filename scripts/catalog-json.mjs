/** 目录 JSON 的离线命令，生成并校验版本化 schema 1 快照，也可独立校验已发布目录。 */
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { link, mkdir, mkdtemp, open, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { buildCatalogModel, CATALOG_SOURCE_BASENAME } from '@graph/catalog-core/model';
import {
  JSON_MANIFEST_FILE, JSON_MANIFEST_MAX_BYTES, JSON_SNAPSHOT_MAX_BYTES, JsonCatalogError,
  isJsonTimestamp, readJsonManifest, readJsonSnapshot
} from '@graph/catalog-core/json-validation';
import { loadPermissionsSource } from './permissions-source.cjs';

const USAGE = 'Usage: catalog-json export --output <directory> [--generated-at <ISO UTC>] | verify --output <directory>';

/** 文件字节的 SHA-256 函数，用于目录分类、版本命名及文件完整性。 */
function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/** schema 1 的 JSON 序列化函数，使用固定的 UTF-8 编码、紧凑格式和末尾换行。 */
function serialize(document) {
  return Buffer.from(JSON.stringify(document) + '\n', 'utf8');
}

/** 离线校验的文件读取函数，拒绝符号链接及非普通文件，并限制实际读入字节。 */
async function readFileBounded(file, maxBytes) {
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > maxBytes) {
      throw new JsonCatalogError('invalid-snapshot', 'Expected a regular catalog file within the byte limit.');
    }
    const bytes = Buffer.allocUnsafe(stat.size + 1);
    // 多读一个字节以识别校验期间增长的文件；校验用的是实际读到的字节。
    let size = 0;
    while (size < bytes.length) {
      const { bytesRead } = await handle.read(bytes, size, bytes.length - size, null);
      if (!bytesRead) break;
      size += bytesRead;
    }
    if (size !== stat.size) throw new JsonCatalogError('invalid-snapshot', 'Catalog file size changed during verification.');
    return bytes.subarray(0, size);
  } finally {
    await handle.close();
  }
}

/** 给定目录的独立校验函数，先检查指针，再按精确字节摘要与 schema 验证快照。 */
async function verify(directory) {
  const manifest = readJsonManifest(await readFileBounded(join(directory, JSON_MANIFEST_FILE), JSON_MANIFEST_MAX_BYTES));
  const bytes = await readFileBounded(join(directory, manifest.snapshot), JSON_SNAPSHOT_MAX_BYTES);
  const snapshot = await readJsonSnapshot(bytes, manifest);
  return { manifest, snapshot, byteLength: bytes.length };
}

/** 生成目录的发布函数，先验证暂存文件，再保留不可变快照，最后替换 current.json。 */
async function publish(directory, manifest, bytes) {
  await mkdir(directory, { recursive: true });
  const stage = await mkdtemp(join(directory, '.catalog-stage-'));
  try {
    const stagedSnapshot = join(stage, manifest.snapshot);
    const stagedManifest = join(stage, JSON_MANIFEST_FILE);
    await writeFile(stagedSnapshot, bytes, { flag: 'wx' });
    await writeFile(stagedManifest, serialize(manifest), { flag: 'wx' });
    const verified = await verify(stage);
    const destination = join(directory, manifest.snapshot);
    try {
      // 同一文件系统内只添加新名字；并发或重复发布都不能覆盖已有版本。
      await link(stagedSnapshot, destination);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const existing = await readFileBounded(destination, JSON_SNAPSHOT_MAX_BYTES);
      if (!existing.equals(bytes)) {
        throw new JsonCatalogError('invalid-snapshot', 'An existing catalog version contains different bytes.');
      }
    }
    await rename(stagedManifest, join(directory, JSON_MANIFEST_FILE));
    return verified;
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

/** 真实安全源的加载入口；CLI 错误只提供可操作说明，避免回显自定义源路径或内容。 */
async function loadSource() {
  try {
    return await loadPermissionsSource();
  } catch (error) {
    if (error.cause?.code) {
      throw new JsonCatalogError('load-failed', 'Cannot read the permissions input. Check PERMISSIONS_SOURCE and file access.');
    }
    throw new JsonCatalogError('invalid-snapshot', 'Permissions input failed JSON, schema, or digest validation. Check the sanitized source and PERMISSIONS_SHA256.');
  }
}

/** 离线生成入口，记录实际或指定的生成时间，并从内容派生不可变版本。 */
async function generate(directory, generatedAt) {
  const { data, sha256: sourceSha256 } = await loadSource();
  const { resource, classificationInput, classificationVersion, excludedRscCount } = buildCatalogModel(data);
  const content = {
    schemaVersion: 1,
    source: { fileName: CATALOG_SOURCE_BASENAME, sha256: sourceSha256, generatedAt, classificationVersion, excludedRscCount },
    classificationHash: sha256(classificationInput),
    resources: [resource]
  };
  // 版本摘要不含 version 本身；artifactSha256 另对带 version 的最终文件字节计算。
  const version = sha256(serialize(content));
  const bytes = serialize({ ...content, version });
  const manifest = { schemaVersion: 1, version, snapshot: `catalog-${version}.json`, artifactSha256: sha256(bytes) };
  return publish(directory, manifest, bytes);
}

/** 根目录 CLI 入口，仅打印逻辑文件名、非敏感摘要和统计。 */
async function main() {
  const [command, ...args] = process.argv.slice(2);
  const { values } = parseArgs({ args, options: { output: { type: 'string' }, 'generated-at': { type: 'string' } } });
  const specifiedTime = values['generated-at'];
  if (!values.output?.trim() || (command !== 'export' && command !== 'verify')
    || (specifiedTime !== undefined && (command !== 'export' || !isJsonTimestamp(specifiedTime)))) {
    throw new JsonCatalogError('invalid-snapshot', USAGE);
  }
  const output = resolve(values.output);
  const result = command === 'verify' ? await verify(output)
    : await generate(output, specifiedTime === undefined ? new Date().toISOString() : new Date(specifiedTime).toISOString());
  const { manifest, snapshot, byteLength } = result;
  const definitions = snapshot.resources.flatMap(resource => resource.definitions);
  const disabled = definitions.filter(entry => !entry.definition.isEnabled).length;
  console.log(`${command === 'verify' ? 'Verified' : 'Published'} ${manifest.snapshot} (${byteLength} bytes)`);
  console.log(`SHA256: ${manifest.artifactSha256}`);
  console.log(`Definitions: ${definitions.length} total, ${disabled} disabled, ${snapshot.source.excludedRscCount} RSC excluded`);
}

main().catch(error => {
  let message = 'Could not read or write the catalog publication directory.';
  if (error instanceof JsonCatalogError) message = error.message;
  if (error.code?.startsWith('ERR_PARSE_ARGS_')) message = USAGE;
  if (error.code === 'ENOENT') message = 'The catalog publication file or directory was not found.';
  console.error(message);
  process.exitCode = 1;
});
