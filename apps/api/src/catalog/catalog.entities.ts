import type { RawPermission } from '../../../../scripts/permissions-source.cjs';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { PermissionDefinition, PermissionType, SourceInfo } from '@graph/contracts';

@Entity('catalog_resource')
export class CatalogResource {
  @PrimaryColumn('text') resourceId!: string;
}
@Entity('catalog_import')
export class CatalogImport {
  @PrimaryColumn('text') id!: string;
  @Column('text') resourceId!: string;
  @Column('text') displayName!: string;
  @Column('boolean') active!: boolean;
  @Column('text') classificationHash!: string;
  @Column('simple-json') source!: SourceInfo;
}
@Entity('catalog_category')
export class CatalogCategory {
  @PrimaryColumn('text') versionId!: string;
  @PrimaryColumn('text') category!: string;
  @Column('text') displayName!: string;
  @Column('text') description!: string;
}
@Entity('catalog_family')
export class CatalogFamily {
  @PrimaryColumn('text') versionId!: string;
  @PrimaryColumn('text') family!: string;
  @PrimaryColumn('text') category!: string;
}
@Entity('catalog_definition')
export class CatalogDefinition {
  @PrimaryColumn('text') versionId!: string;
  @PrimaryColumn('text') permissionType!: PermissionType;
  @PrimaryColumn('text') id!: string;
  @Column('text') value!: string;
  @Column('text') category!: string;
  @Column('text') family!: string;
  @Column('simple-json') definition!: PermissionDefinition;
  // Safe original fields (including appRole origin/member types), never tenant metadata.
  @Column('simple-json') rawDefinition!: RawPermission;
}
export const CATALOG_ENTITIES = [CatalogResource, CatalogImport, CatalogCategory, CatalogFamily, CatalogDefinition];
