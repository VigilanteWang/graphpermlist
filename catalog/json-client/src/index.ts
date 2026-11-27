/** 从 current.json 找到并校验目录快照。界面随后可以从内存里的快照查询列表、计数和详情。 */
import type {
  CatalogClient, CatalogJsonArtifactMetadata, CatalogJsonSnapshot, CatalogResourceModel,
  CatalogJsonSnapshotSource, CategoryListResult, PermissionDetailResult, PermissionListResult,
  PermissionQueryOptions, ResourceListResult
} from '@graph/contracts';
import { countPermissions, queryCategories, queryDetail, queryPermissions } from '@graph/catalog-core';
import {
  JSON_MANIFEST_FILE, JSON_MANIFEST_MAX_BYTES, JSON_SNAPSHOT_MAX_BYTES,
  JsonCatalogError, readJsonManifest, readJsonSnapshot
} from '@graph/catalog-json/validation';

/** 由前端提供的文件读取函数。file 是已配置目录中的文件名，signal 用来取消整次下载。 */
export type JsonCatalogLoader = (file: string, signal: AbortSignal) => Promise<Response>;

/** 客户端的四种状态。idle 和 loading 还没有快照，ready 和 refreshing 都可以查到有效快照。 */
export type JsonCatalogState = 'idle' | 'loading' | 'ready' | 'refreshing';

/** 会话中已通过全部校验的发布物，记录完整快照及已核验的文件摘要。 */
interface Publication {
  snapshot: CatalogJsonSnapshot;
  artifact: CatalogJsonArtifactMetadata;
}

/** 多个调用共用的一次加载。subscribers 是等待结果的调用数，降到零时可以取消下载。 */
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

/** 检查调用是否已取消。下载、校验和等待返回后都可能需要重新检查。 */
function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError();
}

/** 读取正文前检查 HTTP 状态和响应头。例如 403 表示访问被拒绝，200 也可能返回登录页 HTML。 */
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

/** 分段读取一个发布文件。每段都检查累计字节数，所以响应没有 Content-Length 时也能限制文件大小。 */
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
    /** 取消当前读取流，覆盖 loader 没有响应 signal 的情况。 */
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
      // 文件超限或读取失败时也要停止接收剩余内容。已读完时，cancel() 会立即返回。
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

/** 按 App ID 查 resource，和 HTTP API 一样忽略大小写，查不到时报告 not-found。 */
function findResource(publication: Publication, resourceId: string): CatalogResourceModel {
  const normalized = resourceId.toLowerCase();
  const resource = publication.snapshot.resources.find(item => item.resourceId === normalized);
  if (!resource) throw new JsonCatalogError('not-found', 'Resource not found.');
  return resource;
}

/** 查询结果的来源构造函数，复制元数据以免调用方修改会话快照。 */
function queryMetadata({ snapshot, artifact }: Publication): JsonQueryMetadata {
  return { dataState: 'ready', source: { ...snapshot.source }, artifact: { ...artifact } };
}

/** 供界面使用的 JSON CatalogClient。前端负责文件位置和读取权限，客户端负责校验快照和执行查询。 */
export class JsonCatalogClient implements CatalogClient {
  // current 是已验证且可查询的快照，flight 是正在下载或校验的任务。刷新时两者可以同时存在。
  private current?: Publication;
  private flight?: Flight;

  /** JSON 客户端的构造函数，接收一个可取消、可读取两个发布文件的前端 loader。 */
  constructor(private readonly loader: JsonCatalogLoader) {}

  /** 客户端的当前加载状态，用于前端区分首次加载、刷新与已有可用快照。 */
  get state(): JsonCatalogState {
    if (this.current) return this.flight ? 'refreshing' : 'ready';
    return this.flight ? 'loading' : 'idle';
  }

  /** 确保已有可查询快照。首次加载失败后可以重试，已有快照时直接复用。 */
  async load(signal?: AbortSignal): Promise<void> {
    await this.getPublication(signal);
  }

  /** 主动读取 current.json 查看发布内容。并发调用共用一次加载，失败或取消时保留原有快照。 */
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

  /** permission 列表查询，返回合并行和筛选统计。复制行内 definitions，让调用方修改结果时保留快照原样。 */
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

  /** 为一次查询取得快照。已有快照时，即使正在刷新也能立即用它查询。 */
  private async getPublication(signal?: AbortSignal): Promise<Publication> {
    checkAborted(signal);
    const publication = this.current ?? await this.subscribe(signal);
    checkAborted(signal);
    return publication;
  }

  /** 开始一次共享加载。先读 current.json，再读它指定的快照，两份文件都校验通过后才更新 current。 */
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

  /** 让一个调用等待共享任务。例如列表取消后，详情仍可继续等同一份快照。 */
  private subscribe(signal?: AbortSignal): Promise<Publication> {
    const flight = this.flight ?? this.start();
    flight.subscribers++;
    return new Promise((resolve, reject) => {
      /** 结束这个调用的等待，移除监听并减去一个订阅者。 */
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
