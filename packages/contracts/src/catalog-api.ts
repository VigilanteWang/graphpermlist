/** 目录 HTTP API 的响应正文契约，由 Nest 服务和 HTTP client 共用。 */
import type {
  CatalogImportSource,
  CatalogQueryMetadata,
  CategoryListResult,
  PermissionDetailResult,
  PermissionListResult,
  ResourceListResult
} from './catalog-query.js';

/** HTTP 成功响应的结构，复用查询结果的业务字段，来源使用数据库导入元数据。 */
type CatalogApiResponse<TResult extends CatalogQueryMetadata> = Omit<TResult, 'source' | 'artifact'> & {
  source: CatalogImportSource | null;
};

/** HTTP resource 列表响应，尚无导入时返回空列表。 */
export type CatalogApiResourceListResponse = CatalogApiResponse<ResourceListResult>;
/** HTTP category 列表响应，包含筛选后的分类及计数。 */
export type CatalogApiCategoryListResponse = CatalogApiResponse<CategoryListResult>;
/** HTTP permission 列表响应，包含合并行及计数。 */
export type CatalogApiPermissionListResponse = CatalogApiResponse<PermissionListResult>;
/** HTTP permission 详情响应，包含命中行和该 permission 的完整定义。 */
export type CatalogApiPermissionDetailResponse = CatalogApiResponse<PermissionDetailResult>;

/** 目录 HTTP API 的错误响应正文，参数校验失败时 message 可以包含多条错误。 */
export interface CatalogApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}
