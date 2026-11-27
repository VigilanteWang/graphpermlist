/** HTTP API 和 JSON client 共用的只读目录客户端契约。 */
import type {
  CategoryListResult, PermissionDetailResult, PermissionListResult, PermissionQueryOptions, ResourceListResult
} from './catalog-query.js';

/** 只读目录客户端的接口，约定各数据源共用的查询方法；signal 可用于取消请求。 */
export interface CatalogClient {
  /** resource 列表查询方法，返回列表与目录状态。 */
  resources(signal?: AbortSignal): Promise<ResourceListResult>;
  /** category 查询方法，返回指定 resource 在筛选条件下的分类列表和数量。 */
  categories(resourceId: string, query?: PermissionQueryOptions, signal?: AbortSignal): Promise<CategoryListResult>;
  /** permission 列表查询方法，返回指定 resource 中按名称合并的行。 */
  permissions(resourceId: string, query?: PermissionQueryOptions, signal?: AbortSignal): Promise<PermissionListResult>;
  /** permission 详情查询方法，返回命中行及全部类型定义。 */
  detail(
    resourceId: string, permissionValue: string, query?: PermissionQueryOptions, signal?: AbortSignal
  ): Promise<PermissionDetailResult>;
}
