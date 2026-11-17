/** 本地目录的查询服务文件，负责活动快照读取、纯查询适配及 HTTP 异常映射。 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { countPermissions, queryCategories, queryDetail, queryPermissions } from '@graph/catalog-core';
import type { CategoriesResponse, PermissionDetailResponse, PermissionQuery, PermissionRow,
  PermissionsResponse, ResourcesResponse } from '@graph/contracts';
import { CatalogCategory, CatalogDefinition, CatalogImport } from './catalog.entities';

/** 只读目录查询服务，使用 TypeORM 仓储读取 resource、permission 列表、分类统计和详情。 */
@Injectable()
export class CatalogService {
  /** 查询服务的构造函数，接收 Nest 注入的三个实体仓储，每个仓储对应一张表。 */
  constructor(
    @InjectRepository(CatalogImport) private readonly imports: Repository<CatalogImport>,
    @InjectRepository(CatalogDefinition) private readonly definitions: Repository<CatalogDefinition>,
    @InjectRepository(CatalogCategory) private readonly categoriesRepository: Repository<CatalogCategory>
  ) {}

  /** resource 列表查询方法，返回已导入的 resource 和数量；无活动快照时返回尚未导入状态。 */
  async resources(): Promise<ResourcesResponse> {
    const versions = await this.imports.find({ where: { active: true }, order: { resourceId: 'ASC' } });
    if (!versions.length) return { dataState: 'not-imported', source: null, items: [] };
    const items = await Promise.all(versions.map(async version => ({ resourceId: version.resourceId,
      displayName: version.displayName, ...countPermissions(await this.rows(version, {})) })));
    return { dataState: 'ready', source: versions[0].source, items };
  }

  /** permission 列表查询方法，返回指定 resource 在当前筛选条件下的合并行和数量。 */
  async permissions(resourceId: string, query: PermissionQuery): Promise<PermissionsResponse> {
    const version = await this.activeVersion(resourceId);
    const items = await this.rows(version, query);
    return { dataState: 'ready', source: version.source, ...countPermissions(items), items };
  }

  /** category 数量查询方法，按筛选结果统计各分类，仅返回仍含 permission 的分类。 */
  async categories(resourceId: string, query: PermissionQuery): Promise<CategoriesResponse> {
    const version = await this.activeVersion(resourceId);
    const rows = await this.rows(version, query);
    const categories = await this.categoriesRepository.find({ where: { versionId: version.id } });
    const items = queryCategories(categories, rows);
    return { dataState: 'ready', source: version.source, ...countPermissions(rows), items };
  }

  /** 单个 permission 的详情查询方法，返回可见行和当前快照中该 permission 的全部定义。 */
  async detail(resourceId: string, value: string, query: PermissionQuery): Promise<PermissionDetailResponse> {
    const version = await this.activeVersion(resourceId);
    const all = await this.definitions.find({ where: { versionId: version.id, value } });
    const detail = queryDetail(version.resourceId, all, value, query);
    if (!detail) throw new NotFoundException('Permission not found');
    return { dataState: 'ready', source: version.source, ...detail };
  }

  /** 活动快照的内部查询方法，按小写 resource ID 查找，不存在时抛出 404 异常。 */
  private async activeVersion(resourceId: string): Promise<CatalogImport> {
    const version = await this.imports.findOneBy({ resourceId: resourceId.toLowerCase(), active: true });
    if (!version) throw new NotFoundException('Resource not found');
    return version;
  }

  /** 快照内合并行的读取方法，先读取全部定义，再进行筛选和同名 permission 合并。 */
  private async rows(version: CatalogImport, query: PermissionQuery): Promise<PermissionRow[]> {
    const entries = await this.definitions.find({ where: { versionId: version.id } });
    // 实体仅作为结构化输入传给纯函数；共享模块不导入数据库类型或 Nest 异常。
    return queryPermissions(version.resourceId, entries, query);
  }
}
