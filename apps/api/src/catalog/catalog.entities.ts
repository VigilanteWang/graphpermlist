/** 本地目录的 TypeORM 实体文件，描述 resource、快照及 permission 定义等数据的存储结构。 */
import type { RawPermission } from '../../../../scripts/permissions-source.cjs';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { CatalogImportSource, PermissionDefinition, PermissionType } from '@graph/contracts';

/** Graph resource 的数据库实体；resourceId 是该表的主键。 */
@Entity('catalog_resource')
export class CatalogResource {
  // @PrimaryColumn 声明主键；同一个 resource 只保存一个标识。
  @PrimaryColumn('text') resourceId!: string;
}
/** 一次导入快照的数据库实体；active 标识当前查询使用的版本，source 保存来源信息。 */
@Entity('catalog_import')
export class CatalogImport {
  @PrimaryColumn('text') id!: string;
  @Column('text') resourceId!: string;
  @Column('text') displayName!: string;
  @Column('boolean') active!: boolean;
  @Column('text') classificationHash!: string;
  @Column('simple-json') source!: CatalogImportSource;
}
/** 某个快照内服务 category 的数据库实体；versionId 与 category 共同组成主键。 */
@Entity('catalog_category')
export class CatalogCategory {
  @PrimaryColumn('text') versionId!: string;
  @PrimaryColumn('text') category!: string;
  @Column('text') displayName!: string;
  @Column('text') description!: string;
}
/** 快照中 family 与 category 关系的数据库实体，允许同一 family 出现在不同 category 中。 */
@Entity('catalog_family')
export class CatalogFamily {
  @PrimaryColumn('text') versionId!: string;
  @PrimaryColumn('text') family!: string;
  @PrimaryColumn('text') category!: string;
}
/** 单条 Application 或 Delegated permission 定义的数据库实体，由快照、类型和 ID 共同标识。 */
@Entity('catalog_definition')
export class CatalogDefinition {
  @PrimaryColumn('text') versionId!: string;
  @PrimaryColumn('text') permissionType!: PermissionType;
  @PrimaryColumn('text') id!: string;
  @Column('text') value!: string;
  @Column('text') category!: string;
  @Column('text') family!: string;
  // simple-json 将完整定义序列化存入单列，读取时恢复为对象。
  @Column('simple-json') definition!: PermissionDefinition;
  // 仅保留安全的原始定义字段（含 appRole 来源和成员类型），不保存租户元数据。
  @Column('simple-json') rawDefinition!: RawPermission;
}
// 集中导出实体列表，供数据库连接和功能模块注册使用。
export const CATALOG_ENTITIES = [CatalogResource, CatalogImport, CatalogCategory, CatalogFamily, CatalogDefinition];
