/** 把本地 Graph permission 文件整理成目录数据，写入 API 查询使用的 SQLite 数据库。 */
import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { buildCatalogModel, CATALOG_SOURCE_BASENAME } from '@graph/catalog-core/model';
import { loadPermissionsSource } from '../../../../scripts/permissions-source.cjs';
import { CatalogCategory, CatalogDefinition, CatalogFamily, CatalogImport, CatalogResource } from './catalog.entities';

/** 本地目录的导入服务。每个 resource 的新快照写完后，才会设为当前查询使用的版本。 */
@Injectable()
export class CatalogImportService {
  // 同一 SQLite 连接不能安全执行重叠的 TypeORM 事务，因此将导入任务串行排队。
  private pending: Promise<unknown> = Promise.resolve();
  /** 导入服务的构造函数，接收 Nest 注入的数据库连接和配置服务。 */
  constructor(private readonly database: DataSource, private readonly config: ConfigService) {}

  /** 文件导入的入口。任务按调用顺序执行，返回快照 ID、是否复用已有版本以及 definition 数量。 */
  importFile(): Promise<{ versionId: string; reused: boolean; definitionCount: number }> {
    const work = this.pending.then(() => this.importSnapshot());
    // 调用者收到本次失败，队列仍可继续执行下一次导入。
    this.pending = work.catch(() => undefined);
    return work;
  }

  /** 一次实际导入的流程，先读文件并分类，再在同一事务中保存新版本并切换当前快照。 */
  private async importSnapshot(): Promise<{ versionId: string; reused: boolean; definitionCount: number }> {
    const { data, sha256 } = await loadPermissionsSource({
      source: this.config.get<string>('PERMISSIONS_SOURCE'),
      expectedSha256: this.config.get<string>('PERMISSIONS_SHA256')
    });
    const { resource, classificationVersion, classificationInput, excludedRscCount } = buildCatalogModel(data);
    const { resourceId, displayName, definitions, categories, families } = resource;
    const classificationHash = createHash('sha256').update(classificationInput).digest('hex');

    return this.database.transaction(async manager => {
      const active = await manager.findOneBy(CatalogImport, { resourceId, active: true });
      // 源文件字节和分类输入的摘要都与当前版本相同时，沿用已有快照 ID。
      if (active?.source.sha256 === sha256 && active.classificationHash === classificationHash) {
        return { versionId: active.id, reused: true, definitionCount: definitions.length };
      }
      await manager.upsert(CatalogResource, { resourceId }, ['resourceId']);
      const versionId = randomUUID();
      await manager.insert(CatalogImport, { id: versionId, resourceId, displayName,
        active: false, classificationHash, source: {
          // 对外仅返回稳定的逻辑文件名，避免泄露操作者的源文件名或本地路径。
          fileName: CATALOG_SOURCE_BASENAME, sha256, importedAt: new Date().toISOString(),
          classificationVersion, excludedRscCount
        } });
      await manager.insert(CatalogCategory, categories.map(item => ({ versionId, ...item })));
      await manager.insert(CatalogFamily, families.map(item => ({ versionId, ...item })));
      // 分批插入以避开 SQLite 参数数量限制；事务中任一步失败都会回滚全部写入。
      for (let offset = 0; offset < definitions.length; offset += 50) {
        await manager.insert(CatalogDefinition, definitions.slice(offset, offset + 50).map(entry => ({
          versionId, permissionType: entry.definition.permissionType, id: entry.definition.id, ...entry
        })));
      }
      // 完整写入后再切换活动快照，避免查询读到尚未完成的导入。
      await manager.update(CatalogImport, { resourceId, active: true }, { active: false });
      await manager.update(CatalogImport, { id: versionId }, { active: true });
      return { versionId, reused: false, definitionCount: definitions.length };
    });
  }
}
