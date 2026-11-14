import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CategoriesResponse, Counts, PermissionDetailResponse, PermissionQuery, PermissionRow,
  PermissionsResponse, ResourcesResponse } from '@graph/contracts';
import { CatalogCategory, CatalogDefinition, CatalogImport } from './catalog.entities';

const countRows = (rows: PermissionRow[]): Counts => ({ permissionCount: rows.length,
  definitionCount: rows.reduce((sum, row) => sum + row.definitions.length, 0) });
const orderText = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(CatalogImport) private readonly imports: Repository<CatalogImport>,
    @InjectRepository(CatalogDefinition) private readonly definitions: Repository<CatalogDefinition>,
    @InjectRepository(CatalogCategory) private readonly categoriesRepository: Repository<CatalogCategory>
  ) {}

  async resources(): Promise<ResourcesResponse> {
    const versions = await this.imports.find({ where: { active: true }, order: { resourceId: 'ASC' } });
    if (!versions.length) return { dataState: 'not-imported', source: null, items: [] };
    const items = await Promise.all(versions.map(async version => ({ resourceId: version.resourceId,
      displayName: version.displayName, ...countRows(await this.rows(version, {})) })));
    return { dataState: 'ready', source: versions[0].source, items };
  }

  async permissions(resourceId: string, query: PermissionQuery): Promise<PermissionsResponse> {
    const version = await this.activeVersion(resourceId);
    const items = await this.rows(version, query);
    return { dataState: 'ready', source: version.source, ...countRows(items), items };
  }

  async categories(resourceId: string, query: PermissionQuery): Promise<CategoriesResponse> {
    const version = await this.activeVersion(resourceId);
    const rows = await this.rows(version, query);
    const categories = await this.categoriesRepository.find({ where: { versionId: version.id } });
    const items = categories.map(({ category, displayName, description }) => ({ category, displayName, description,
      ...countRows(rows.filter(row => row.category === category)) })).filter(item => item.permissionCount > 0)
      .sort((a, b) => orderText(a.displayName, b.displayName));
    return { dataState: 'ready', source: version.source, ...countRows(rows), items };
  }

  async detail(resourceId: string, value: string, query: PermissionQuery): Promise<PermissionDetailResponse> {
    const version = await this.activeVersion(resourceId);
    const all = await this.definitions.find({ where: { versionId: version.id, value } });
    const item = this.merge(version, all, query)[0];
    if (!item) throw new NotFoundException('Permission not found');
    const allDefinitions = all.map(row => row.definition).sort((a, b) => orderText(a.permissionType, b.permissionType));
    return { dataState: 'ready', source: version.source, item, allDefinitions };
  }

  private async activeVersion(resourceId: string): Promise<CatalogImport> {
    const version = await this.imports.findOneBy({ resourceId: resourceId.toLowerCase(), active: true });
    if (!version) throw new NotFoundException('Resource not found');
    return version;
  }

  private async rows(version: CatalogImport, query: PermissionQuery): Promise<PermissionRow[]> {
    return this.merge(version, await this.definitions.find({ where: { versionId: version.id } }), query);
  }

  private merge(version: CatalogImport, entries: CatalogDefinition[], query: PermissionQuery): PermissionRow[] {
    const q = query.q?.trim().toLowerCase() ?? '';
    const merged = new Map<string, PermissionRow>();
    for (const entry of entries) {
      const definition = entry.definition;
      if ((!query.showDisabled && !definition.isEnabled)
        || (query.category !== undefined && query.category !== entry.category)
        || (query.family !== undefined && query.family !== entry.family)
        || (query.permissionType !== undefined && definition.permissionType !== query.permissionType)
        || (query.adminConsentRequired !== undefined && definition.adminConsentRequired !== query.adminConsentRequired)) continue;
      const search = [entry.value, definition.id, definition.title, definition.description];
      if (definition.permissionType === 'Delegated') search.push(definition.userConsentTitle, definition.userConsentDescription);
      if (q && !search.some(text => text.toLowerCase().includes(q))) continue;
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
