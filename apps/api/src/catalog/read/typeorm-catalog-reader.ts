/** 将 TypeORM 中已发布的目录版本转换成查询服务使用的普通目录数据。 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogCategory, CatalogDefinition, CatalogFamily, CatalogImport } from '../catalog.entities';
import type { ActiveCatalogSnapshot, CatalogReader } from './catalog-reader';

/** SQLite 的目录读取适配器，按活动版本 ID 读取该版快照的内容。 */
@Injectable()
export class TypeOrmCatalogReader implements CatalogReader {
  /** 读取适配器的构造函数，接收导入版本、category、family 与 definition 的 Repository。 */
  constructor(
    @InjectRepository(CatalogImport) private readonly imports: Repository<CatalogImport>,
    @InjectRepository(CatalogCategory) private readonly categories: Repository<CatalogCategory>,
    @InjectRepository(CatalogFamily) private readonly families: Repository<CatalogFamily>,
    @InjectRepository(CatalogDefinition) private readonly definitions: Repository<CatalogDefinition>
  ) {}

  /** 所有已发布 resource 的活动快照，按 App ID 排列。 */
  async listActive(): Promise<ActiveCatalogSnapshot[]> {
    const imports = await this.imports.find({ where: { active: true }, order: { resourceId: 'ASC' } });
    return Promise.all(imports.map(version => this.readVersion(version)));
  }

  /** 指定 Resource App ID 的活动快照，App ID 按小写查询。 */
  async readActive(resourceId: string): Promise<ActiveCatalogSnapshot | undefined> {
    const version = await this.imports.findOneBy({ resourceId: resourceId.toLowerCase(), active: true });
    return version ? this.readVersion(version) : undefined;
  }

  /** 已选版本的目录数据；每张表都用同一版本 ID，即使导入流程随后切换了活动版本。 */
  private async readVersion(version: CatalogImport): Promise<ActiveCatalogSnapshot> {
    const where = { versionId: version.id };
    const [categories, families, definitions] = await Promise.all([
      this.categories.find({ where }),
      this.families.find({ where }),
      this.definitions.find({ where })
    ]);
    return {
      versionId: version.id,
      resourceId: version.resourceId,
      displayName: version.displayName,
      classificationHash: version.classificationHash,
      source: version.source,
      categories: categories.map(({ category, displayName, description }) => ({ category, displayName, description })),
      families: families.map(({ category, family }) => ({ category, family })),
      definitions: definitions.map(({ value, category, family, definition, rawDefinition }) =>
        ({ value, category, family, definition, rawDefinition }))
    };
  }
}
