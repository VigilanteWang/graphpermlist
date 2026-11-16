/** 目录数据库的初始版本迁移文件，包含建表及撤销操作。 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 目录初始表结构的 TypeORM 迁移类，通过显式版本迁移创建 SQLite 表。 */
export class CatalogSchema1794528000000 implements MigrationInterface {
  /** 本版本迁移的执行方法，按依赖顺序创建 resource、导入版本、category、family 和定义表。 */
  async up(runner: QueryRunner): Promise<void> {
    // 外键约束确保定义属于同一版本；唯一索引限制每个 resource 的有效版本。
    for (const sql of [
      `CREATE TABLE catalog_resource (resourceId text PRIMARY KEY NOT NULL)`,
      `CREATE TABLE catalog_import (id text PRIMARY KEY NOT NULL, resourceId text NOT NULL REFERENCES catalog_resource(resourceId), displayName text NOT NULL, active boolean NOT NULL CHECK(active IN (0,1)), classificationHash text NOT NULL, source text NOT NULL)`,
      `CREATE UNIQUE INDEX catalog_active_resource ON catalog_import(resourceId) WHERE active = 1`,
      `CREATE TABLE catalog_category (versionId text NOT NULL REFERENCES catalog_import(id), category text NOT NULL, displayName text NOT NULL, description text NOT NULL, PRIMARY KEY(versionId, category))`,
      `CREATE TABLE catalog_family (versionId text NOT NULL, family text NOT NULL, category text NOT NULL, PRIMARY KEY(versionId, category, family), FOREIGN KEY(versionId,category) REFERENCES catalog_category(versionId,category))`,
      `CREATE TABLE catalog_definition (versionId text NOT NULL REFERENCES catalog_import(id), permissionType text NOT NULL CHECK(permissionType IN ('Delegated','Application')), id text NOT NULL, value text NOT NULL, category text NOT NULL, family text NOT NULL, definition text NOT NULL, rawDefinition text NOT NULL, PRIMARY KEY(versionId,permissionType,id), FOREIGN KEY(versionId,category) REFERENCES catalog_category(versionId,category), FOREIGN KEY(versionId,category,family) REFERENCES catalog_family(versionId,category,family))`,
      `CREATE INDEX catalog_definition_value ON catalog_definition(versionId,value)`
    ]) await runner.query(sql);
  }
  /** 本版本迁移的撤销方法，按外键依赖的相反顺序删除表。 */
  async down(runner: QueryRunner): Promise<void> {
    for (const name of ['catalog_definition', 'catalog_family', 'catalog_category', 'catalog_import', 'catalog_resource']) {
      await runner.query(`DROP TABLE ${name}`);
    }
  }
}
