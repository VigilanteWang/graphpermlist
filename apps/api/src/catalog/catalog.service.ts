/** 本地目录的查询服务文件，包含活动快照读取、筛选、合并和响应组装逻辑。 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CategoriesResponse, Counts, PermissionDetailResponse, PermissionQuery, PermissionRow,
  PermissionsResponse, ResourcesResponse } from '@graph/contracts';
import { CatalogCategory, CatalogDefinition, CatalogImport } from './catalog.entities';

/** 合并行的数量统计函数，分别计算行数和行内定义数。 */
const countRows = (rows: PermissionRow[]): Counts => ({ permissionCount: rows.length,
  definitionCount: rows.reduce((sum, row) => sum + row.definitions.length, 0) });
/** 文本排序的比较函数，按字符串大小返回比较结果。 */
const orderText = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

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
      displayName: version.displayName, ...countRows(await this.rows(version, {})) })));
    return { dataState: 'ready', source: versions[0].source, items };
  }

  /** permission 列表查询方法，返回指定 resource 在当前筛选条件下的合并行和数量。 */
  async permissions(resourceId: string, query: PermissionQuery): Promise<PermissionsResponse> {
    const version = await this.activeVersion(resourceId);
    const items = await this.rows(version, query);
    return { dataState: 'ready', source: version.source, ...countRows(items), items };
  }

  /** category 数量查询方法，按筛选结果统计各分类，仅返回仍含 permission 的分类。 */
  async categories(resourceId: string, query: PermissionQuery): Promise<CategoriesResponse> {
    const version = await this.activeVersion(resourceId);
    const rows = await this.rows(version, query);
    const categories = await this.categoriesRepository.find({ where: { versionId: version.id } });
    const items = categories.map(({ category, displayName, description }) => ({ category, displayName, description,
      ...countRows(rows.filter(row => row.category === category)) })).filter(item => item.permissionCount > 0)
      .sort((a, b) => orderText(a.displayName, b.displayName));
    return { dataState: 'ready', source: version.source, ...countRows(rows), items };
  }

  /** 单个 permission 的详情查询方法，返回可见行和当前快照中该 permission 的全部定义。 */
  async detail(resourceId: string, value: string, query: PermissionQuery): Promise<PermissionDetailResponse> {
    const version = await this.activeVersion(resourceId);
    const all = await this.definitions.find({ where: { versionId: version.id, value } });
    const item = this.merge(version, all, query)[0];
    if (!item) throw new NotFoundException('Permission not found');
    // item 遵循筛选条件，allDefinitions 保留完整的 Application 和 Delegated 定义。
    const allDefinitions = all.map(row => row.definition).sort((a, b) => orderText(a.permissionType, b.permissionType));
    return { dataState: 'ready', source: version.source, item, allDefinitions };
  }

  /** 活动快照的内部查询方法，按小写 resource ID 查找，不存在时抛出 404 异常。 */
  private async activeVersion(resourceId: string): Promise<CatalogImport> {
    const version = await this.imports.findOneBy({ resourceId: resourceId.toLowerCase(), active: true });
    if (!version) throw new NotFoundException('Resource not found');
    return version;
  }

  /** 快照内合并行的读取方法，先读取全部定义，再进行筛选和同名 permission 合并。 */
  private async rows(version: CatalogImport, query: PermissionQuery): Promise<PermissionRow[]> {
    return this.merge(version, await this.definitions.find({ where: { versionId: version.id } }), query);
  }

  /** permission 定义的筛选与合并方法，先筛选单条定义，再按 value 合并、排序并计算可见类型。 */
  private merge(version: CatalogImport, entries: CatalogDefinition[], query: PermissionQuery): PermissionRow[] {
    const q = query.q?.trim().toLowerCase() ?? '';
    const merged = new Map<string, PermissionRow>();
    for (const entry of entries) {
      // 先对定义筛选，再合并为行，因此数量和 visibleTypes 都反映筛选后的内容。
      const definition = entry.definition;
      if ((!query.showDisabled && !definition.isEnabled)
        || (query.category !== undefined && query.category !== entry.category)
        || (query.family !== undefined && query.family !== entry.family)
        || (query.permissionType !== undefined && definition.permissionType !== query.permissionType)
        || (query.adminConsentRequired !== undefined && definition.adminConsentRequired !== query.adminConsentRequired)) continue;
      const search = [entry.value, definition.id, definition.title, definition.description];
      if (definition.permissionType === 'Delegated') search.push(definition.userConsentTitle, definition.userConsentDescription);
      if (q && !search.some(text => text.toLowerCase().includes(q))) continue;
      // 同一 permission value 的 Application 和 Delegated 定义在列表中合为一行。
      let row = merged.get(entry.value);
      if (!row) {
        row = { resourceId: version.resourceId, value: entry.value, category: entry.category, family: entry.family,
          visibleTypes: [], definitions: [] };
        merged.set(entry.value, row);
      }
      row.definitions.push(definition);
    }
    return [...merged.values()].sort((a, b) => orderText(a.value, b.value)).map(row => {
      row.definitions.sort((a, b) => orderText(a.permissionType, b.permissionType));
      row.visibleTypes = [...new Set(row.definitions.map(definition => definition.permissionType))];
      return row;
    });
  }
}
