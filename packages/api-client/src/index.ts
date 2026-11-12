import type {
  ApiErrorBody, CategoriesResponse, PermissionDetailResponse,
  PermissionQuery, PermissionsResponse, ResourcesResponse
} from '@graph/contracts';

export class CatalogApiError extends Error {
  constructor(public readonly status: number, public readonly body: ApiErrorBody) {
    super(Array.isArray(body.message) ? body.message.join('; ') : body.message);
    this.name = 'CatalogApiError';
  }
}

export interface CatalogClient {
  resources(signal?: AbortSignal): Promise<ResourcesResponse>;
  categories(resourceId: string, query?: PermissionQuery, signal?: AbortSignal): Promise<CategoriesResponse>;
  permissions(resourceId: string, query?: PermissionQuery, signal?: AbortSignal): Promise<PermissionsResponse>;
  detail(resourceId: string, permissionValue: string, query?: PermissionQuery, signal?: AbortSignal): Promise<PermissionDetailResponse>;
}

/** baseUrl includes /api/v1. fetch may be injected by a host/test, without identity coupling. */
export function createCatalogClient(baseUrl: string, fetcher: typeof fetch = globalThis.fetch): CatalogClient {
  const base = baseUrl.replace(/\/+$/, '');
  async function get<T>(path: string, query?: PermissionQuery, signal?: AbortSignal): Promise<T> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) params.set(key, String(value));
    }
    const suffix = params.size ? `?${params}` : '';
    const response = await fetcher(`${base}${path}${suffix}`, { signal, credentials: 'omit' });
    if (!response.ok) {
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
  const resourcePath = (id: string): string => `/resources/${encodeURIComponent(id)}`;
  return {
    resources: signal => get('/resources', undefined, signal),
    categories: (id, query, signal) => get(`${resourcePath(id)}/categories`, query, signal),
    permissions: (id, query, signal) => get(`${resourcePath(id)}/permissions`, query, signal),
    detail: (id, value, query, signal) => get(`${resourcePath(id)}/permissions/${encodeURIComponent(value)}`, query, signal)
  };
}
