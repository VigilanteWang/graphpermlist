import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import type { PermissionDefinition, PermissionType } from '@graph/contracts';
import { loadPermissionsSource, type RawPermission } from '../../../../scripts/permissions-source.cjs';
import { CATEGORIES, CLASSIFICATION_VERSION, classifyPermission } from './classification';
import { CatalogCategory, CatalogDefinition, CatalogFamily, CatalogImport, CatalogResource } from './catalog.entities';

@Injectable()
export class CatalogImportService {
  // One SQLite connection cannot safely run overlapping TypeORM transactions.
  private pending: Promise<unknown> = Promise.resolve();
  constructor(private readonly database: DataSource, private readonly config: ConfigService) {}

  importFile(): Promise<{ versionId: string; reused: boolean; definitionCount: number }> {
    const work = this.pending.then(() => this.importSnapshot());
    this.pending = work.catch(() => undefined);
    return work;
  }

  private async importSnapshot(): Promise<{ versionId: string; reused: boolean; definitionCount: number }> {
    const { data, sha256 } = await loadPermissionsSource({
      source: this.config.get<string>('PERMISSIONS_SOURCE'),
      expectedSha256: this.config.get<string>('PERMISSIONS_SHA256')
    });
    const rows: Omit<CatalogDefinition, 'versionId'>[] = [];
    const add = (raw: RawPermission, permissionType: PermissionType): void => {
      const base = { id: raw.id.toLowerCase(), isEnabled: raw.isEnabled,
        title: permissionType === 'Application' ? raw.displayName : raw.adminConsentDisplayName,
        description: permissionType === 'Application' ? raw.description : raw.adminConsentDescription };
      const definition: PermissionDefinition = permissionType === 'Application'
        ? { ...base, permissionType, adminConsentRequired: true, adminConsentRule: 'application-always-required' }
        : { ...base, permissionType, adminConsentRequired: raw.type === 'Admin', consentType: raw.type,
          userConsentTitle: raw.userConsentDisplayName, userConsentDescription: raw.userConsentDescription,
          adminConsentRule: 'delegated-consent-type' };
      rows.push({ permissionType, id: definition.id, value: raw.value, ...classifyPermission(raw.value),
        definition, rawDefinition: { ...raw } });
    };
    data.appRoles.filter(item => item.allowedMemberTypes.includes('Application')).forEach(item => add(item, 'Application'));
    data.oauth2PermissionScopes.forEach(item => add(item, 'Delegated'));
    const classifications = rows.map(({ value, category, family }) => ({ value, category, family }));
    const classificationHash = createHash('sha256').update(JSON.stringify({ version: CLASSIFICATION_VERSION,
      categories: CATEGORIES, classifications })).digest('hex');

    return this.database.transaction(async manager => {
      const active = await manager.findOneBy(CatalogImport, { resourceId: data.appId, active: true });
      if (active?.source.sha256 === sha256 && active.classificationHash === classificationHash) {
        return { versionId: active.id, reused: true, definitionCount: rows.length };
      }
      await manager.upsert(CatalogResource, { resourceId: data.appId }, ['resourceId']);
      const versionId = randomUUID();
      await manager.insert(CatalogImport, { id: versionId, resourceId: data.appId, displayName: data.displayName,
        active: false, classificationHash, source: {
          // Publish a stable logical name, never the operator's source filename or path.
          fileName: 'commercial-graph-permlist.json', sha256, importedAt: new Date().toISOString(),
          classificationVersion: CLASSIFICATION_VERSION, excludedRscCount: data.resourceSpecificApplicationPermissions.length
        } });
      const usedCategories = new Set(rows.map(row => row.category));
      await manager.insert(CatalogCategory, CATEGORIES.filter(item => usedCategories.has(item.category)).map(item => ({ versionId, ...item })));
      const families = new Map(rows.map(row => [JSON.stringify([row.category, row.family]),
        { versionId, family: row.family, category: row.category }]));
      await manager.insert(CatalogFamily, [...families.values()]);
      // Batches stay below SQLite's parameter limit. Any failure rolls back all writes.
      for (let offset = 0; offset < rows.length; offset += 50) {
        await manager.insert(CatalogDefinition, rows.slice(offset, offset + 50).map(row => ({ versionId, ...row })));
      }
      await manager.update(CatalogImport, { resourceId: data.appId, active: true }, { active: false });
      await manager.update(CatalogImport, { id: versionId }, { active: true });
      return { versionId, reused: false, definitionCount: rows.length };
    });
  }
}
