/** 离线目录的快照编码、暂存验证、不可变文件和 current.json 发布流程。 */
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { link, mkdir, mkdtemp, open, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildCatalogModel } from '@graph/catalog-ingest';
import {
  JSON_MANIFEST_FILE, JSON_MANIFEST_MAX_BYTES, JSON_SNAPSHOT_MAX_BYTES, JsonCatalogError,
  readJsonManifest, readJsonSnapshot
} from '@graph/catalog-json/validation';
import { loadPermissionsSources } from '@graph/catalog-source';

/** SHA-256 摘要函数。对传入的内容计算摘要，返回十六进制字符串。 */
function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/** 发布 JSON 的文件编码。空格和换行都会改变文件摘要，这里固定用紧凑 JSON 加一个末尾换行。 */
function serialize(document) {
  return Buffer.from(JSON.stringify(document) + '\n', 'utf8');
}

/**
 * 校验时用的文件读取函数，只读取大小符合限制的普通文件。
 * @param {string} file 要读取的 current.json 或快照文件路径。
 * @param {number} maxBytes 允许的最大文件字节数。
 * @returns {Promise<Buffer>} 实际读到的文件字节。
 */
async function readFileBounded(file, maxBytes) {
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > maxBytes) {
      throw new JsonCatalogError('invalid-snapshot', 'Expected a regular catalog file within the byte limit.');
    }
    const bytes = Buffer.allocUnsafe(stat.size + 1);
    // 多留一个字节，检测文件在读取期间是否变长。实际读到的大小必须与打开时一致。
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

/** 目录校验入口。从 current.json 读出快照名和预期摘要，再校验快照文件字节及内容结构。 */
export async function verify(directory) {
  const manifest = readJsonManifest(await readFileBounded(join(directory, JSON_MANIFEST_FILE), JSON_MANIFEST_MAX_BYTES));
  const bytes = await readFileBounded(join(directory, manifest.snapshot), JSON_SNAPSHOT_MAX_BYTES);
  const snapshot = await readJsonSnapshot(bytes, manifest);
  return { manifest, snapshot, byteLength: bytes.length };
}

/** 本地发布流程。先在暂存目录校验两个文件，放好快照后再替换 current.json。 */
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
      // 用硬链接添加版本文件。若文件名已存在，只在内容完全相同的情况下复用。
      await link(stagedSnapshot, destination);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const existing = await readFileBounded(destination, JSON_SNAPSHOT_MAX_BYTES);
      if (!existing.equals(bytes)) {
        throw new JsonCatalogError('invalid-snapshot', 'An existing catalog version contains different bytes.');
      }
    }
    // 先放好快照再切换指针，让按 current.json 读目录的客户端总能找到它指向的文件。
    await rename(stagedManifest, join(directory, JSON_MANIFEST_FILE));
    return verified;
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

/** 快照输入的加载入口。JSON 发布使用清单，可以用只含一项的清单发布单个 resource。 */
async function loadSource() {
  if (process.env.PERMISSIONS_SOURCE) {
    throw new JsonCatalogError('invalid-snapshot',
      'JSON export requires a resource manifest. Unset PERMISSIONS_SOURCE and use PERMISSIONS_CONFIG for a custom or single-resource manifest.');
  }
  try {
    return await loadPermissionsSources({ source: '' });
  } catch (error) {
    if (error.cause?.code) {
      throw new JsonCatalogError('load-failed', 'Cannot read the permissions input. Check PERMISSIONS_CONFIG and file access.');
    }
    throw new JsonCatalogError('invalid-snapshot', 'Permissions input failed JSON, schema, or digest validation. Check the resource manifest and the sanitized source files.');
  }
}

/** 生成目录快照的入口。使用与 SQLite 导入相同的目录模型，另在 JSON 中记录生成时间。 */
export async function generate(directory, generatedAt) {
  const { inputs } = await loadSource();
  const resources = inputs.map(({ data, sha256: sourceSha256, classification, displayName, fileName }) => {
    const { resource, browseMode, classificationInput, classificationVersion, excludedRscCount } =
      buildCatalogModel(data, { classification, displayName });
    const source = { fileName, sha256: sourceSha256, classificationVersion, excludedRscCount };
    return { ...resource, browseMode, source, classificationHash: sha256(classificationInput) };
  });

  const schemaVersion = 2;
  const content = { schemaVersion, generatedAt, resources };
  // version 用来命名快照，取自加入 version 字段前的 JSON。
  // artifactSha256 按最终文件字节计算，供读取方检查文件是否完整。
  const version = sha256(serialize(content));
  const bytes = serialize({ ...content, version });
  const manifest = { schemaVersion, version, snapshot: `catalog-${version}.json`, artifactSha256: sha256(bytes) };
  return publish(directory, manifest, bytes);
}
