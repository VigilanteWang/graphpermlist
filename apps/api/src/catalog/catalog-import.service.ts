/** Graph permission 的离线导入服务，负责将共享目录模型原子写入 SQLite。 */
import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { buildCatalogModel, CATALOG_SOURCE_BASENAME } from '@graph/catalog-core/model';
import { loadPermissionsSource } from '../../../../scripts/permissions-source.cjs';
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
    const { resource, classificationVersion, classificationInput, excludedRscCount } = buildCatalogModel(data);
    const { resourceId, displayName, definitions, categories, families } = resource;
    const classificationHash = createHash('sha256').update(classificationInput).digest('hex');

    return this.database.transaction(async manager => {
      const active = await manager.findOneBy(CatalogImport, { resourceId, active: true });
      // 源文件和分类结果都未变化时复用活动版本，避免重复写入。
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
