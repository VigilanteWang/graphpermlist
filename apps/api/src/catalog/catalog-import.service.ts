/** Graph permission 的离线导入服务文件，包含源数据转换和快照写入逻辑。 */
import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import type { PermissionDefinition, PermissionType } from '@graph/contracts';
import { loadPermissionsSource, type RawPermission } from '../../../../scripts/permissions-source.cjs';
import { CATEGORIES, CLASSIFICATION_VERSION, classifyPermission } from './classification';
import { CatalogCategory, CatalogDefinition, CatalogFamily, CatalogImport, CatalogResource } from './catalog.entities';

/** permission 数据的离线导入服务，负责校验、转换、串行写入和事务内的活动快照切换。 */
@Injectable()
export class CatalogImportService {
  // 同一 SQLite 连接不能安全执行重叠的 TypeORM 事务，因此将导入任务串行排队。
  private pending: Promise<unknown> = Promise.resolve();
  /** 导入服务的构造函数，接收 Nest 注入的数据库连接和配置服务。 */
  constructor(private readonly database: DataSource, private readonly config: ConfigService) {}

  /** 一次文件导入的公开入口方法，将任务排队执行；某次失败不会阻断后续任务。 */
  importFile(): Promise<{ versionId: string; reused: boolean; definitionCount: number }> {
    const work = this.pending.then(() => this.importSnapshot());
    this.pending = work.catch(() => undefined);
    return work;
  }

  /** 单次快照导入的内部方法，读取和校验源数据，复用未变化的快照或原子写入新快照。 */
  private async importSnapshot(): Promise<{ versionId: string; reused: boolean; definitionCount: number }> {
    const { data, sha256 } = await loadPermissionsSource({
      source: this.config.get<string>('PERMISSIONS_SOURCE'),
      expectedSha256: this.config.get<string>('PERMISSIONS_SHA256')
    });
    const rows: Omit<CatalogDefinition, 'versionId'>[] = [];
    /** 单条源定义的转换函数，将 Application 或 Delegated permission 加入待写入数组，并保留原始字段。 */
    const add = (raw: RawPermission, permissionType: PermissionType): void => {
      const base = { id: raw.id.toLowerCase(), isEnabled: raw.isEnabled,
        title: permissionType === 'Application' ? raw.displayName : raw.adminConsentDisplayName,
        description: permissionType === 'Application' ? raw.description : raw.adminConsentDescription };
      // Application 固定要求 admin consent；Delegated 则读取源数据中的 consent type。
      const definition: PermissionDefinition = permissionType === 'Application'
        ? { ...base, permissionType, adminConsentRequired: true, adminConsentRule: 'application-always-required' }
        : { ...base, permissionType, adminConsentRequired: raw.type === 'Admin', consentType: raw.type,
          userConsentTitle: raw.userConsentDisplayName, userConsentDescription: raw.userConsentDescription,
          adminConsentRule: 'delegated-consent-type' };
      rows.push({ permissionType, id: definition.id, value: raw.value, ...classifyPermission(raw.value),
        definition, rawDefinition: { ...raw } });
    };
    // 只导入允许 Application 的 appRoles；RSC 仅记录排除数量，不写入普通目录。
    data.appRoles.filter(item => item.allowedMemberTypes.includes('Application')).forEach(item => add(item, 'Application'));
    data.oauth2PermissionScopes.forEach(item => add(item, 'Delegated'));
    // 同时计算分类规则和分类结果的哈希，确保分类变化也会触发新快照。
    const classifications = rows.map(({ value, category, family }) => ({ value, category, family }));
    const classificationHash = createHash('sha256').update(JSON.stringify({ version: CLASSIFICATION_VERSION,
      categories: CATEGORIES, classifications })).digest('hex');

    return this.database.transaction(async manager => {
      const active = await manager.findOneBy(CatalogImport, { resourceId: data.appId, active: true });
      // 源文件和分类结果都未变化时复用活动版本，避免重复写入。
      if (active?.source.sha256 === sha256 && active.classificationHash === classificationHash) {
        return { versionId: active.id, reused: true, definitionCount: rows.length };
      }
      await manager.upsert(CatalogResource, { resourceId: data.appId }, ['resourceId']);
      const versionId = randomUUID();
      await manager.insert(CatalogImport, { id: versionId, resourceId: data.appId, displayName: data.displayName,
        active: false, classificationHash, source: {
          // 对外仅返回稳定的逻辑文件名，避免泄露操作者的源文件名或本地路径。
          fileName: 'commercial-graph-permlist.json', sha256, importedAt: new Date().toISOString(),
          classificationVersion: CLASSIFICATION_VERSION, excludedRscCount: data.resourceSpecificApplicationPermissions.length
        } });
      const usedCategories = new Set(rows.map(row => row.category));
      await manager.insert(CatalogCategory, CATEGORIES.filter(item => usedCategories.has(item.category)).map(item => ({ versionId, ...item })));
      const families = new Map(rows.map(row => [JSON.stringify([row.category, row.family]),
        { versionId, family: row.family, category: row.category }]));
      await manager.insert(CatalogFamily, [...families.values()]);
      // 分批插入以避开 SQLite 参数数量限制；事务中任一步失败都会回滚全部写入。
      for (let offset = 0; offset < rows.length; offset += 50) {
        await manager.insert(CatalogDefinition, rows.slice(offset, offset + 50).map(row => ({ versionId, ...row })));
      }
      // 完整写入后再切换活动快照，避免查询读到尚未完成的导入。
      await manager.update(CatalogImport, { resourceId: data.appId, active: true }, { active: false });
      await manager.update(CatalogImport, { id: versionId }, { active: true });
      return { versionId, reused: false, definitionCount: rows.length };
    });
  }
}
