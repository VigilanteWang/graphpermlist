import { createRequire } from 'node:module';

// 浏览器验收始终从默认真实资源清单或专用测试清单构造隔离内存数据库。
process.env.SQLITE_PATH = ':memory:';
process.env.PERMISSIONS_SOURCE = '';
process.env.PERMISSIONS_SHA256 = '';
process.env.PERMISSIONS_CONFIG = process.env.CATALOG_TEST_RESOURCE_CONFIG ?? '';
const require = createRequire(import.meta.url);
const { createApp } = require('../../apps/api/dist/bootstrap.js');
const { DataSource } = require('typeorm');
const { ConfigService } = require('@nestjs/config');
const { CatalogImportService } = require('../../apps/api/dist/catalog/import/catalog-import.service.js');
const app = await createApp();
try {
  const database = app.get(DataSource);
  if (database.options.database !== ':memory:') throw new Error('Browser tests require an in-memory catalog.');
  await database.runMigrations();
  await app.get(CatalogImportService).importFile();
  const config = app.get(ConfigService);
  await app.listen(config.getOrThrow('PORT'), config.getOrThrow('HOST'));
} catch (error) {
  await app.close();
  throw error;
}
