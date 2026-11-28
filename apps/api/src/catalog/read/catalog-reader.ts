/** 目录查询服务使用的读取契约。适配器读取已发布的普通目录数据，再交给查询核心。 */
import type { CatalogBrowseMode, CatalogImportSource, CatalogResourceModel } from '@graph/contracts';

/** Nest 读取 provider 的标识，用于把 CatalogReader 接口接入查询服务。 */
export const CATALOG_READER = Symbol('CatalogReader');

/** 一个活动 resource 的目录版本，包含完整导航、definitions 及该版本的来源。 */
export interface ActiveCatalogSnapshot extends CatalogResourceModel {
  versionId: string;
  browseMode: CatalogBrowseMode;
  classificationHash: string;
  source: CatalogImportSource;
}

/** 活动目录的读取接口，供查询服务获取当前快照。 */
export interface CatalogReader {
  /** 列出所有已发布 resource 的活动快照；尚未导入时返回空列表。 */
  listActive(): Promise<ActiveCatalogSnapshot[]>;
  /** 返回指定 Resource App ID 的活动快照；未找到时返回 undefined。 */
  readActive(resourceId: string): Promise<ActiveCatalogSnapshot | undefined>;
}
