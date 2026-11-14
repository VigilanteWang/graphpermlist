import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createApp } = require('../../apps/api/dist/bootstrap.js');
const { DataSource } = require('typeorm');
const { ConfigService } = require('@nestjs/config');
const app = await createApp();
try {
  await app.get(DataSource).runMigrations();
  const config = app.get(ConfigService);
  await app.listen(config.getOrThrow('PORT'), config.getOrThrow('HOST'));
} catch (error) {
  await app.close();
  throw error;
}
