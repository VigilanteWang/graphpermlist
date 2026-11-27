/** 为每个目录快照保存其浏览方式。既有 Graph 版本继续使用 category 浏览。 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 新增活动快照浏览方式的 SQLite 迁移，保留导入记录、版本 ID 和已有数据。 */
export class CatalogBrowseMode1795737600000 implements MigrationInterface {
  /** 新增 browseMode 列；首次迁移时现有行自动使用 category。 */
  async up(runner: QueryRunner): Promise<void> {
    await runner.query("ALTER TABLE catalog_import ADD COLUMN browseMode text NOT NULL DEFAULT 'category' CHECK(browseMode IN ('category','family'))");
  }

  /** 撤销浏览方式列。 */
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('ALTER TABLE catalog_import DROP COLUMN browseMode');
  }
}
