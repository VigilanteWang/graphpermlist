/** 从 SQLite 读取当前目录快照，调用共享查询函数，再把结果交给 HTTP 控制器。 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { countPermissions, queryCategories, queryDetail, queryPermissions } from '@graph/catalog-core';
import type {
  CatalogApiCategoryListResponse,
  CatalogApiPermissionDetailResponse,
  CatalogApiPermissionListResponse,
  CatalogApiResourceListResponse,
  MergedPermissionRow,
  PermissionQueryOptions
} from '@graph/contracts';
import { CatalogCategory, CatalogDefinition, CatalogImport } from './catalog.entities';

/** 目录查询服务。列表、category 统计和详情都从当前 resource 的活动快照读取。 */
@Injectable()
export class CatalogService {
  /** 查询服务的构造函数，接收 Nest 注入的三个实体仓储，每个仓储对应一张表。 */
  constructor(
    @InjectRepository(CatalogImport) private readonly imports: Repository<CatalogImport>,
    @InjectRepository(CatalogDefinition) private readonly definitions: Repository<CatalogDefinition>,
    @InjectRepository(CatalogCategory) private readonly categoriesRepository: Repository<CatalogCategory>
  ) {}

  /** 已导入的 resource 列表及各自的 permission 数量。还没导入任何快照时，返回 not-imported 和空列表。 */
  async resources(): Promise<CatalogApiResourceListResponse> {
    const versions = await this.imports.find({ where: { active: true }, order: { resourceId: 'ASC' } });
    if (!versions.length) return { dataState: 'not-imported', source: null, items: [] };
    const items = await Promise.all(versions.map(async version => ({ resourceId: version.resourceId,
      displayName: version.displayName, ...countPermissions(await this.rows(version, {})) })));
    return { dataState: 'ready', source: versions[0].source, items };
  }

  /** 当前筛选条件下的 permission 列表。相同 value 的命中项合并成一行，例如 User.Read.All 的两种类型。 */
  async permissions(resourceId: string, query: PermissionQueryOptions): Promise<CatalogApiPermissionListResponse> {
    const version = await this.activeVersion(resourceId);
    const items = await this.rows(version, query);
    return { dataState: 'ready', source: version.source, ...countPermissions(items), items };
  }

  /** 各 category 在当前筛选下的数量。先筛出 permission，再统计各 category，只返回有命中的项。 */
  async categories(resourceId: string, query: PermissionQueryOptions): Promise<CatalogApiCategoryListResponse> {
    const version = await this.activeVersion(resourceId);
    const rows = await this.rows(version, query);
    const categories = await this.categoriesRepository.find({ where: { versionId: version.id } });
    const items = queryCategories(categories, rows);
    return { dataState: 'ready', source: version.source, ...countPermissions(rows), items };
  }

  /** 单个 permission 的详情。item 只含命中的 definition，allDefinitions 还包含同名但被筛掉的 definition。 */
  async detail(resourceId: string, value: string, query: PermissionQueryOptions): Promise<CatalogApiPermissionDetailResponse> {
    const version = await this.activeVersion(resourceId);
    const all = await this.definitions.find({ where: { versionId: version.id, value } });
    const detail = queryDetail(version.resourceId, all, value, query);
    // 查不到这个 value 或它的 definition 全被筛掉时，HTTP 返回 404。
    if (!detail) throw new NotFoundException('Permission not found');
    return { dataState: 'ready', source: version.source, ...detail };
  }

  /** 指定 resource 当前使用的快照，按小写的 resource ID 查找。未导入该 resource 时返回 HTTP 404。 */
  private async activeVersion(resourceId: string): Promise<CatalogImport> {
    const version = await this.imports.findOneBy({ resourceId: resourceId.toLowerCase(), active: true });
    if (!version) throw new NotFoundException('Resource not found');
    return version;
  }

  /** 一版快照的 permission 行。先按快照 ID 读出 definition，再筛选并合并同名项。 */
  private async rows(version: CatalogImport, query: PermissionQueryOptions): Promise<MergedPermissionRow[]> {
    const entries = await this.definitions.find({ where: { versionId: version.id } });
    // API 和 JSON 客户端使用同一套筛选规则。这里把 SQLite 查到的数据交给共享查询函数。
    return queryPermissions(version.resourceId, entries, query);
  }
}
