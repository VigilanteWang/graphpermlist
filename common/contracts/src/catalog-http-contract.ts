/** 定义 Nest 服务返回给 HTTP client 的成功和错误响应正文。 */
import type {
  CatalogImportSource,
  CatalogQueryMetadata,
  CatalogResourceSummary,
  CategoryListResult,
  PermissionDetailResult,
  PermissionListResult,
  ResourceListResult
} from './catalog-query.js';

/** HTTP 成功响应沿用查询结果的列表、计数或详情字段，source 记录数据库导入来源。 */
type CatalogApiResponse<TResult extends CatalogQueryMetadata> = Omit<TResult, 'source' | 'artifact'> & {
  source: CatalogImportSource | null;
};

/** HTTP resource 概览的来源对应 SQLite 的活动版本及实际导入时间。 */
export type CatalogApiResourceSummary = Omit<CatalogResourceSummary, 'source'> & { source?: CatalogImportSource };

/** HTTP resource 列表响应，尚无导入时返回空列表。 */
export type CatalogApiResourceListResponse = Omit<CatalogApiResponse<ResourceListResult>, 'items'> & {
  items: CatalogApiResourceSummary[];
};
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
