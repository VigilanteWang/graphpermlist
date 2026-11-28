/** 把网站和 SPFx 的目录查询转换成 HTTP GET 请求，并把 API 响应交给共享界面。 */
import type {
  CatalogApiCategoryListResponse,
  CatalogApiErrorBody,
  CatalogApiPermissionDetailResponse,
  CatalogApiPermissionListResponse,
  CatalogApiResourceListResponse,
  CatalogClient,
  PermissionQueryOptions
} from '@graph/contracts';

/** 目录 API 请求失败时抛出的错误，保留 HTTP 状态码和服务端给出的错误正文。 */
export class CatalogApiError extends Error {
  /** 用 API 的错误正文创建 Error。多个校验错误合并成一条可显示的消息。 */
  constructor(public readonly status: number, public readonly body: CatalogApiErrorBody) {
    super(Array.isArray(body.message) ? body.message.join('; ') : body.message);
    this.name = 'CatalogApiError';
  }
}

// 保留旧入口的类型导出，已有前端无需同步修改调用方式。
export type { CatalogClient } from '@graph/contracts';

/**
 * 创建只读目录客户端。四种查询使用同一个 API 基址，发送请求时省略浏览器凭据。
 * @param baseUrl - 包含 /api/v1 的 API 基址。
 * @param fetcher - 发起请求的函数，默认是浏览器的 fetch。
 * @returns 可取消请求的只读客户端。
 */
export function createApiCatalogClient(baseUrl: string, fetcher: typeof fetch = globalThis.fetch): CatalogClient {
  // 去掉末尾斜杠，避免拼接路径时出现重复分隔符。
  const base = baseUrl.replace(/\/+$/, '');
  /** 执行一次 GET 查询。把筛选值放入 URL，成功时读 JSON，HTTP 失败时抛出 CatalogApiError。 */
  async function get<T>(path: string, query?: PermissionQueryOptions, signal?: AbortSignal): Promise<T> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      // 例如 adminConsentRequired=false 表示只查无需 admin consent 的定义，必须随请求发送。
      if (value !== undefined) params.set(key, String(value));
    }
    const suffix = params.size ? `?${params}` : '';
    const response = await fetcher(`${base}${path}${suffix}`, { signal, credentials: 'omit' });
    if (!response.ok) {
      // 错误正文可能不是 JSON；解析失败时仍构造可显示的错误。
      let raw: unknown;
      try { raw = await response.json(); } catch { raw = undefined; }
      const candidate = raw && typeof raw === 'object' ? raw as Partial<CatalogApiErrorBody> : undefined;
      const message = candidate?.message;
      const validMessage = typeof message === 'string' && message.length > 0 ||
        Array.isArray(message) && message.length > 0 && message.every(item => typeof item === 'string');
      const body: CatalogApiErrorBody = { statusCode: response.status,
        message: validMessage ? message as string | string[] : response.statusText || 'Catalog request failed' };
      if (typeof candidate?.error === 'string') body.error = candidate.error;
      throw new CatalogApiError(response.status, body);
    }
    return response.json() as Promise<T>;
  }
  /** resource URL 路径的构造函数，对标识编码以避免特殊字符改变路径结构。 */
  const resourcePath = (id: string): string => `/resources/${encodeURIComponent(id)}`;
  return {
    resources: signal => get<CatalogApiResourceListResponse>('/resources', undefined, signal),
    categories: (id, query, signal) =>
      get<CatalogApiCategoryListResponse>(`${resourcePath(id)}/categories`, query, signal),
    permissions: (id, query, signal) =>
      get<CatalogApiPermissionListResponse>(`${resourcePath(id)}/permissions`, query, signal),
    detail: (id, value, query, signal) =>
      get<CatalogApiPermissionDetailResponse>(`${resourcePath(id)}/permissions/${encodeURIComponent(value)}`, query, signal)
  };
}

/** HTTP client 工厂的兼容别名，供使用原名称的调用方继续使用。 */
export const createCatalogClient = createApiCatalogClient;
