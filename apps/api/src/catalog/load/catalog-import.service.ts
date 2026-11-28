/** 把本地 resource permission 文件整理成目录数据，写入 API 查询使用的 SQLite 数据库。 */
import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, type EntityManager } from 'typeorm';
import { buildCatalogModel } from '@graph/catalog-ingest';
import { loadPermissionsSources } from '@graph/catalog-source';
import { CatalogCategory, CatalogDefinition, CatalogFamily, CatalogImport, CatalogResource } from '../catalog.entities';

/** 已写入或复用的快照，包含活动版本 ID 和普通 definition 总数。 */
interface ImportedVersion {
  versionId: string;
  reused: boolean;
  definitionCount: number;
}

/** 清单模式下整批导入的结果，每条资源记录独立报告复用状态。 */
interface ImportedBatch {
  resources: (ImportedVersion & { resourceId: string })[];
  definitionCount: number;
  reused: boolean;
}

/** 本地目录的导入服务。每个 resource 的新快照写完后，才会设为当前查询使用的版本。 */
@Injectable()
export class CatalogImportService {
  // 同一 SQLite 连接不能安全执行重叠的 TypeORM 事务，因此将导入任务串行排队。
  private pending: Promise<unknown> = Promise.resolve();
  /** 导入服务的构造函数，接收 Nest 注入的数据库连接和配置服务。 */
  constructor(private readonly database: DataSource, private readonly config: ConfigService) {}

  /** 清单导入的入口。任务按调用顺序执行，返回整批结果和各 resource 的版本。 */
  importFile(): Promise<ImportedBatch> {
    const work = this.pending.then(() => this.importSnapshot());
    // 调用者收到本次失败，队列仍可继续执行下一次导入。
    this.pending = work.catch(() => undefined);
    return work;
  }

  /** 导入批次。全部源完成校验和建模后，才开启一个事务写入或复用各 resource 的版本。 */
  private async importSnapshot(): Promise<ImportedBatch> {
    const inputs = await loadPermissionsSources({
      configPath: this.config.get<string>('PERMISSIONS_CONFIG')
    });
    const models = inputs.map(({ data, classification, displayName, fileName, sha256 }) => ({
      model: buildCatalogModel(data, { classification, displayName }), fileName, sha256
    }));

    return this.database.transaction(async manager => {
      const resources: ImportedBatch['resources'] = [];
      for (const { model, fileName, sha256 } of models) {
        const imported = await this.writeVersion(manager, model, fileName, sha256);
        resources.push({ resourceId: model.resource.resourceId, ...imported });
      }
      return {
        resources,
        definitionCount: resources.reduce((sum, item) => sum + item.definitionCount, 0),
        reused: resources.every(item => item.reused)
      };
    });
  }

  /** 写入同一事务中的一个 resource。历史版本保留，让已经选定该版本的读请求可以继续查询。 */
  private async writeVersion(manager: EntityManager, model: ReturnType<typeof buildCatalogModel>,
    fileName: string, sha256: string): Promise<ImportedVersion> {
    const { resource, browseMode, classificationVersion, classificationInput, excludedRscCount } = model;
    const { resourceId, displayName, definitions, categories, families } = resource;
    const classificationHash = createHash('sha256').update(classificationInput).digest('hex');
    const active = await manager.findOneBy(CatalogImport, { resourceId, active: true });
    // 源文件字节和分类输入的摘要都与当前版本相同时，沿用已有快照 ID。
    if (active?.source.sha256 === sha256 && active.classificationHash === classificationHash
      && active.displayName === displayName && active.browseMode === browseMode && active.source.fileName === fileName) {
      return { versionId: active.id, reused: true, definitionCount: definitions.length };
    }
    await manager.upsert(CatalogResource, { resourceId }, ['resourceId']);
    const versionId = randomUUID();
    await manager.insert(CatalogImport, { id: versionId, resourceId, displayName,
      active: false, browseMode, classificationHash, source: {
        // 对外仅返回稳定的逻辑文件名，避免泄露操作者的源文件名或本地路径。
        fileName, sha256, importedAt: new Date().toISOString(),
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
  }
}
