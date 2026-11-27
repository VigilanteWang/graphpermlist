/** 目录的 TypeORM 实体。每个类对应一张 SQLite 表，供导入服务写入、查询服务读取。 */
import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { CatalogImportSource, CatalogDefinitionWithRawFields, PermissionDefinition, PermissionType } from '@graph/contracts';

/** Graph resource 的记录。每个 resource 保存一条记录，可关联多次导入的快照。 */
@Entity('catalog_resource')
export class CatalogResource {
  // resourceId 保存 Graph resource 的 App ID。
  @PrimaryColumn('text') resourceId!: string;
}
/** 一次导入的快照记录。active 为 true 时 API 使用这一版，source 记录文件摘要、导入时间等来源信息。 */
@Entity('catalog_import')
export class CatalogImport {
  @PrimaryColumn('text') id!: string;
  @Column('text') resourceId!: string;
  @Column('text') displayName!: string;
  @Column('boolean') active!: boolean;
  @Column('text') classificationHash!: string;
  @Column('simple-json') source!: CatalogImportSource;
}
/** 一版快照中某个 category 的记录，保存界面显示用的名称和描述。versionId 和 category 共同标识这一行。 */
@Entity('catalog_category')
export class CatalogCategory {
  @PrimaryColumn('text') versionId!: string;
  @PrimaryColumn('text') category!: string;
  @Column('text') displayName!: string;
  @Column('text') description!: string;
}
/** 一版快照中 family 所属 category 的记录。同名 family 在不同 category 中各有一条记录。 */
@Entity('catalog_family')
export class CatalogFamily {
  @PrimaryColumn('text') versionId!: string;
  @PrimaryColumn('text') family!: string;
  @PrimaryColumn('text') category!: string;
}
/** 一条 Application 或 Delegated definition。同名 permission 可以有多个 definition，各自按版本、类型和 ID 保存。 */
@Entity('catalog_definition')
export class CatalogDefinition {
  @PrimaryColumn('text') versionId!: string;
  @PrimaryColumn('text') permissionType!: PermissionType;
  @PrimaryColumn('text') id!: string;
  @Column('text') value!: string;
  @Column('text') category!: string;
  @Column('text') family!: string;
  // TypeORM 把对象转成 JSON 文本存入一列，查询时再读成对象供列表和详情使用。
  @Column('simple-json') definition!: PermissionDefinition;
  // 保存源定义中允许保留的字段，例如 appRole 的 origin 和 allowedMemberTypes。
  @Column('simple-json') rawDefinition!: CatalogDefinitionWithRawFields['rawDefinition'];
}
// 集中导出实体列表，供数据库连接和功能模块注册使用。
export const CATALOG_ENTITIES = [CatalogResource, CatalogImport, CatalogCategory, CatalogFamily, CatalogDefinition];
