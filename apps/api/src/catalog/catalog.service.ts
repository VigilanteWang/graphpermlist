/** 通过读取接口取得当前目录快照，调用共享查询函数，再把结果交给 HTTP 控制器。 */
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { countPermissions, queryCategories, queryDetail, queryPermissions } from '@graph/catalog-core';
import type {
  CatalogApiCategoryListResponse,
  CatalogApiPermissionDetailResponse,
  CatalogApiPermissionListResponse,
  CatalogApiResourceListResponse,
  PermissionQueryOptions
} from '@graph/contracts';
import { CATALOG_READER, type ActiveCatalogSnapshot, type CatalogReader } from './read/catalog-reader';

/** 目录查询服务。列表、category 统计和详情都从当前 resource 的活动快照读取。 */
@Injectable()
export class CatalogService {
  /** 查询服务的构造函数，接收 Nest 注入的活动目录读取接口。 */
  constructor(@Inject(CATALOG_READER) private readonly reader: CatalogReader) {}

  /** 已导入的 resource 列表及各自的 permission 数量。还没导入任何快照时，返回 not-imported 和空列表。 */
  async resources(): Promise<CatalogApiResourceListResponse> {
    const versions = await this.reader.listActive();
    if (!versions.length) return { dataState: 'not-imported', source: null, items: [] };
    const items = versions.map(version => ({ resourceId: version.resourceId,
      displayName: version.displayName, ...countPermissions(queryPermissions(version.resourceId, version.definitions)) }));
    return { dataState: 'ready', source: versions[0].source, items };
  }

  /** 当前筛选条件下的 permission 列表。相同 value 的命中项合并成一行，例如 User.Read.All 的两种类型。 */
  async permissions(resourceId: string, query: PermissionQueryOptions): Promise<CatalogApiPermissionListResponse> {
    const version = await this.activeVersion(resourceId);
    const items = queryPermissions(version.resourceId, version.definitions, query);
    return { dataState: 'ready', source: version.source, ...countPermissions(items), items };
  }

  /** 各 category 在当前筛选下的数量。先筛出 permission，再统计各 category，只返回有命中的项。 */
  async categories(resourceId: string, query: PermissionQueryOptions): Promise<CatalogApiCategoryListResponse> {
    const version = await this.activeVersion(resourceId);
    const rows = queryPermissions(version.resourceId, version.definitions, query);
    const items = queryCategories(version.categories, rows);
    return { dataState: 'ready', source: version.source, ...countPermissions(rows), items };
  }

  /** 单个 permission 的详情。item 只含命中的 definition，allDefinitions 还包含同名但被筛掉的 definition。 */
  async detail(resourceId: string, value: string, query: PermissionQueryOptions): Promise<CatalogApiPermissionDetailResponse> {
    const version = await this.activeVersion(resourceId);
    const detail = queryDetail(version.resourceId, version.definitions, value, query);
    // 查不到这个 value 或它的 definition 全被筛掉时，HTTP 返回 404。
    if (!detail) throw new NotFoundException('Permission not found');
    return { dataState: 'ready', source: version.source, ...detail };
  }

  /** 指定 resource 当前使用的快照，按小写的 resource ID 查找。未导入该 resource 时返回 HTTP 404。 */
  private async activeVersion(resourceId: string): Promise<ActiveCatalogSnapshot> {
    const version = await this.reader.readActive(resourceId);
    if (!version) throw new NotFoundException('Resource not found');
    return version;
  }
}
