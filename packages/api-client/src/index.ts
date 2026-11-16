/** 目录 HTTP API 的共享客户端模块，供 Vite 和 SPFx 使用。 */
import type {
  ApiErrorBody, CategoriesResponse, PermissionDetailResponse,
  PermissionQuery, PermissionsResponse, ResourcesResponse
} from '@graph/contracts';

/** 目录 API 请求失败的错误类，包含 HTTP 状态码和错误正文。 */
export class CatalogApiError extends Error {
  /** API 错误类的构造函数，将单条或多条消息组合为标准 Error 的 message。 */
  constructor(public readonly status: number, public readonly body: ApiErrorBody) {
    super(Array.isArray(body.message) ? body.message.join('; ') : body.message);
    this.name = 'CatalogApiError';
  }
}

/** 只读目录客户端的接口，约定两个宿主共用的查询方法；signal 可用于取消请求。 */
export interface CatalogClient {
  /** resource 列表查询方法，返回列表与导入状态。 */
  resources(signal?: AbortSignal): Promise<ResourcesResponse>;
  /** category 查询方法，返回指定 resource 在筛选条件下的分类列表和数量。 */
  categories(resourceId: string, query?: PermissionQuery, signal?: AbortSignal): Promise<CategoriesResponse>;
  /** permission 列表查询方法，返回指定 resource 中按名称合并的行。 */
  permissions(resourceId: string, query?: PermissionQuery, signal?: AbortSignal): Promise<PermissionsResponse>;
  /** permission 详情查询方法，返回命中行及全部类型定义。 */
  detail(resourceId: string, permissionValue: string, query?: PermissionQuery, signal?: AbortSignal): Promise<PermissionDetailResponse>;
}

/**
 * 目录客户端的工厂函数，返回不依赖宿主身份信息的客户端对象。
 * @param baseUrl - 包含 /api/v1 的 API 基址。
 * @param fetcher - 发起请求的函数，可由宿主传入。
 * @returns 可取消请求的只读客户端。
 */
export function createCatalogClient(baseUrl: string, fetcher: typeof fetch = globalThis.fetch): CatalogClient {
  // 去掉末尾斜杠，避免拼接路径时出现重复分隔符。
  const base = baseUrl.replace(/\/+$/, '');
  /** 客户端内部的通用 GET 请求函数，负责查询参数、错误处理及响应解析。 */
  async function get<T>(path: string, query?: PermissionQuery, signal?: AbortSignal): Promise<T> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      // 只跳过未提供的值；false 必须发送，不能当作空值丢弃。
      if (value !== undefined) params.set(key, String(value));
    }
    const suffix = params.size ? `?${params}` : '';
    const response = await fetcher(`${base}${path}${suffix}`, { signal, credentials: 'omit' });
    if (!response.ok) {
      // 错误正文可能不是 JSON；解析失败时仍构造可显示的错误。
      let raw: unknown;
      try { raw = await response.json(); } catch { raw = undefined; }
      const candidate = raw && typeof raw === 'object' ? raw as Partial<ApiErrorBody> : undefined;
      const message = candidate?.message;
      const validMessage = typeof message === 'string' && message.length > 0 ||
        Array.isArray(message) && message.length > 0 && message.every(item => typeof item === 'string');
      const body: ApiErrorBody = { statusCode: response.status,
        message: validMessage ? message as string | string[] : response.statusText || 'Catalog request failed' };
      if (typeof candidate?.error === 'string') body.error = candidate.error;
      throw new CatalogApiError(response.status, body);
    }
    return response.json() as Promise<T>;
  }
  /** resource URL 路径的构造函数，对标识编码以避免特殊字符改变路径结构。 */
  const resourcePath = (id: string): string => `/resources/${encodeURIComponent(id)}`;
  return {
    resources: signal => get('/resources', undefined, signal),
    categories: (id, query, signal) => get(`${resourcePath(id)}/categories`, query, signal),
    permissions: (id, query, signal) => get(`${resourcePath(id)}/permissions`, query, signal),
    detail: (id, value, query, signal) => get(`${resourcePath(id)}/permissions/${encodeURIComponent(value)}`, query, signal)
  };
}
