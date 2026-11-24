/** JSON 版 CatalogClient，管理会话快照、并发读取和重试，并复用中立目录查询。 */
import type {
  CatalogClient, CatalogJsonArtifactMetadata, CatalogJsonSnapshot, CatalogJsonSnapshotResource,
  CatalogJsonSnapshotSource, CategoryListResult, PermissionDetailResult, PermissionListResult,
  PermissionQueryOptions, ResourceListResult
} from '@graph/contracts';
import { countPermissions, queryCategories, queryDetail, queryPermissions } from './index.js';
import {
  JSON_MANIFEST_FILE, JSON_MANIFEST_MAX_BYTES, JSON_SNAPSHOT_MAX_BYTES,
  JsonCatalogError, readJsonManifest, readJsonSnapshot
} from './json-validation.js';

/** 前端注入的文件读取函数；file 是固定目录内的文件名，signal 用于取消共享下载。 */
export type JsonCatalogLoader = (file: string, signal: AbortSignal) => Promise<Response>;

/** client 的可观察加载状态；读取失败由调用的 Promise 报告，已有有效快照仍可用。 */
export type JsonCatalogState = 'idle' | 'loading' | 'ready' | 'refreshing';

/** 会话中已通过全部校验的发布物，记录完整快照及已核验的文件摘要。 */
interface Publication {
  snapshot: CatalogJsonSnapshot;
  artifact: CatalogJsonArtifactMetadata;
}

/** 一次共享加载任务；订阅者全部取消后，可以丢弃任务并立即开始下一次加载。 */
interface Flight {
  controller: AbortController;
  subscribers: number;
  result: Promise<Publication>;
}

/** 查询通用的 JSON 来源元数据，仅由有效发布物产生。 */
interface JsonQueryMetadata {
  dataState: 'ready';
  source: CatalogJsonSnapshotSource;
  artifact: CatalogJsonArtifactMetadata;
}

/** 取消查询使用的标准 AbortError，与 UI 的中止识别逻辑一致。 */
function abortError(): DOMException {
  return new DOMException('Catalog request was aborted.', 'AbortError');
}

/** 中止检查函数，在下载、校验或等待之后的边界阻止取消的任务继续前进。 */
function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError();
}

/** HTTP 响应的读取前检查函数，识别权限、缺失文件、部分响应、登录 HTML 及过大文件。 */
function checkResponse(response: Response, maxBytes: number): void {
  if (response.status === 401 || response.status === 403) {
    throw new JsonCatalogError('permission-denied', 'Access to the catalog file was denied.');
  }
  if (response.status === 404) throw new JsonCatalogError('file-not-found', 'Catalog file was not found.');
  if (response.status !== 200 || !response.body) throw new JsonCatalogError('load-failed', 'Could not read the complete catalog file.');
  const type = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (type === 'text/html' || type === 'application/xhtml+xml') {
    throw new JsonCatalogError('load-failed', 'Catalog file returned HTML instead of JSON.');
  }
  if (Number(response.headers.get('content-length')) > maxBytes) {
    throw new JsonCatalogError('invalid-snapshot', 'Catalog file exceeds the byte limit.');
  }
}

/** 单个发布文件的读取函数，流式限制实际接收字节，包含缺少 Content-Length 的响应。 */
async function loadBytes(loader: JsonCatalogLoader, file: string, maxBytes: number, signal: AbortSignal): Promise<Uint8Array> {
  try {
    checkAborted(signal);
    const response = await loader(file, signal);
    try {
      checkAborted(signal);
      checkResponse(response, maxBytes);
    } catch (error) {
      void response.body?.cancel().catch(() => undefined);
      throw error;
    }
    const reader = response.body!.getReader();
    /** 流读取的中止处理函数，释放可能没有监听 signal 的读取流。 */
    const cancelRead = (): void => { void reader.cancel().catch(() => undefined); };
    signal.addEventListener('abort', cancelRead, { once: true });
    let bytes = new Uint8Array(Math.min(8192, maxBytes));
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        checkAborted(signal);
        if (done) break;
        const nextSize = size + value.byteLength;
        if (nextSize > maxBytes) throw new JsonCatalogError('invalid-snapshot', 'Catalog file exceeds the byte limit.');
        if (nextSize > bytes.byteLength) {
          const expanded = new Uint8Array(Math.min(maxBytes, Math.max(nextSize, bytes.byteLength * 2)));
          expanded.set(bytes);
          bytes = expanded;
        }
        bytes.set(value, size);
        size = nextSize;
      }
    } finally {
      // cancel() 也覆盖大小超限等提前退出，完成的流会立即返回。
      cancelRead();
      signal.removeEventListener('abort', cancelRead);
      reader.releaseLock();
    }
    return bytes.subarray(0, size);
  } catch (error) {
    checkAborted(signal);
    if (error instanceof JsonCatalogError) throw error;
    throw new JsonCatalogError('load-failed', 'Could not read the catalog file.');
  }
}

/** 单个 resource 的查询查找函数，沿用 HTTP API 的 App ID 大小写规则与 not-found 语义。 */
function findResource(publication: Publication, resourceId: string): CatalogJsonSnapshotResource {
  const normalized = resourceId.toLowerCase();
  const resource = publication.snapshot.resources.find(item => item.resourceId === normalized);
  if (!resource) throw new JsonCatalogError('not-found', 'Resource not found.');
  return resource;
}

/** 查询结果的来源构造函数，复制元数据以免调用方修改会话快照。 */
function queryMetadata({ snapshot, artifact }: Publication): JsonQueryMetadata {
  return { dataState: 'ready', source: { ...snapshot.source }, artifact: { ...artifact } };
}

/** 基于已验证发布文件的内存 CatalogClient，文件位置与访问权限由前端维护。 */
export class JsonCatalogClient implements CatalogClient {
  private current?: Publication;
  private flight?: Flight;

  /** JSON 客户端的构造函数，接收一个可取消、可读取两个发布文件的前端 loader。 */
  constructor(private readonly loader: JsonCatalogLoader) {}

  /** 客户端的当前加载状态，用于前端区分首次加载、刷新与已有可用快照。 */
  get state(): JsonCatalogState {
    if (this.current) return this.flight ? 'refreshing' : 'ready';
    return this.flight ? 'loading' : 'idle';
  }

  /** 初始化或重试入口；有效快照已存在时复用当前版本。 */
  async load(signal?: AbortSignal): Promise<void> {
    await this.getPublication(signal);
  }

  /** 显式刷新入口；并发加载合并，刷新失败或取消时保留原有快照。 */
  async refresh(signal?: AbortSignal): Promise<void> {
    checkAborted(signal);
    await this.subscribe(signal);
    checkAborted(signal);
  }

  /** resource 概览查询，按 App ID 排序并统计默认可见的 definitions。 */
  async resources(signal?: AbortSignal): Promise<ResourceListResult> {
    const publication = await this.getPublication(signal);
    checkAborted(signal);
    const items = publication.snapshot.resources.map(({ resourceId, displayName, definitions }) => ({
      resourceId, displayName, ...countPermissions(queryPermissions(resourceId, definitions))
    })).sort((a, b) => a.resourceId.localeCompare(b.resourceId));
    return { ...queryMetadata(publication), items };
  }

  /** category 查询，使用同一批命中 definitions 计算分类和总数。 */
  async categories(resourceId: string, query?: PermissionQueryOptions, signal?: AbortSignal): Promise<CategoryListResult> {
    const publication = await this.getPublication(signal);
    checkAborted(signal);
    const resource = findResource(publication, resourceId);
    const rows = queryPermissions(resource.resourceId, resource.definitions, query);
    return { ...queryMetadata(publication), ...countPermissions(rows), items: queryCategories(resource.categories, rows) };
  }

  /** permission 列表查询，返回合并行和筛选统计；结果可由调用方修改。 */
  async permissions(resourceId: string, query?: PermissionQueryOptions, signal?: AbortSignal): Promise<PermissionListResult> {
    const publication = await this.getPublication(signal);
    checkAborted(signal);
    const resource = findResource(publication, resourceId);
    const rows = queryPermissions(resource.resourceId, resource.definitions, query);
    return { ...queryMetadata(publication), ...countPermissions(rows), items: structuredClone(rows) };
  }

  /** permission 详情查询，按精确 value 获取命中行及该名称下的全部 definitions。 */
  async detail(resourceId: string, value: string, query?: PermissionQueryOptions,
    signal?: AbortSignal): Promise<PermissionDetailResult> {
    const publication = await this.getPublication(signal);
    checkAborted(signal);
    const resource = findResource(publication, resourceId);
    const detail = queryDetail(resource.resourceId, resource.definitions, value, query);
    if (!detail) throw new JsonCatalogError('not-found', 'Permission not found.');
    return { ...queryMetadata(publication), ...structuredClone(detail) };
  }

  /** 单次查询的版本选择函数，刷新期间仍固定使用调用时已有的有效快照。 */
  private async getPublication(signal?: AbortSignal): Promise<Publication> {
    checkAborted(signal);
    const publication = this.current ?? await this.subscribe(signal);
    checkAborted(signal);
    return publication;
  }

  /** 共享加载任务的创建函数，校验全部文件后才切换快照。 */
  private start(): Flight {
    const controller = new AbortController();
    const signal = controller.signal;
    const flight: Flight = {
      controller,
      subscribers: 0,
      result: Promise.resolve().then(async () => {
        try {
          const manifest = readJsonManifest(await loadBytes(this.loader, JSON_MANIFEST_FILE, JSON_MANIFEST_MAX_BYTES, signal));
          const bytes = await loadBytes(this.loader, manifest.snapshot, JSON_SNAPSHOT_MAX_BYTES, signal);
          const snapshot = await readJsonSnapshot(bytes, manifest);
          const publication = { snapshot, artifact: { schemaVersion: manifest.schemaVersion,
            version: manifest.version, sha256: manifest.artifactSha256 } };
          // 被全部订阅者取消的旧任务即使迟到，也不能覆盖新任务或清除新任务状态。
          checkAborted(signal);
          if (this.flight === flight) this.current = publication;
          return publication;
        } finally {
          if (this.flight === flight) this.flight = undefined;
        }
      })
    };
    this.flight = flight;
    return flight;
  }

  /** 单个调用的订阅函数；从共享任务取消一个订阅时，只结束该调用的等待。 */
  private subscribe(signal?: AbortSignal): Promise<Publication> {
    const flight = this.flight ?? this.start();
    flight.subscribers++;
    return new Promise((resolve, reject) => {
      /** 订阅结束的清理函数，分别处理完成、失败与取消后的计数。 */
      const detach = (): void => {
        signal?.removeEventListener('abort', cancel);
        flight.subscribers--;
      };
      /** 订阅中止函数，只有最后一个订阅者离开时才取消整个下载。 */
      const cancel = (): void => {
        detach();
        if (flight.subscribers === 0 && this.flight === flight) {
          this.flight = undefined;
          flight.controller.abort();
        }
        reject(abortError());
      };
      signal?.addEventListener('abort', cancel, { once: true });
      void flight.result.then(
        publication => {
          if (signal?.aborted) return;
          detach();
          resolve(publication);
        },
        error => {
          if (signal?.aborted) return;
          detach();
          reject(error);
        }
      );
    });
  }
}
