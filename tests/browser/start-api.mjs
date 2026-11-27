import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// 浏览器验收始终从仓库内真实快照构造隔离内存数据库。
process.env.SQLITE_PATH = ':memory:';
process.env.PERMISSIONS_SOURCE = fileURLToPath(new URL('../../data/commercial-graph-permlist.json', import.meta.url));
const require = createRequire(import.meta.url);
const { createApp } = require('../../apps/api/dist/bootstrap.js');
const { DataSource } = require('typeorm');
const { ConfigService } = require('@nestjs/config');
const { CatalogImportService } = require('../../apps/api/dist/catalog/import/catalog-import.service.js');
const app = await createApp();
try {
  await app.get(DataSource).runMigrations();
  await app.get(CatalogImportService).importFile();
  const config = app.get(ConfigService);
  await app.listen(config.getOrThrow('PORT'), config.getOrThrow('HOST'));
} catch (error) {
  await app.close();
  throw error;
}
