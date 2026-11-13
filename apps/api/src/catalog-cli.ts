import 'reflect-metadata';
import { type INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { CatalogImportService } from './catalog/catalog-import.service';

async function main(): Promise<void> {
  let app: INestApplicationContext | undefined;
  try {
    const command = process.argv[2];
    if (command !== 'migrate' && command !== 'import') throw new Error('Expected migrate or import');
    app = await NestFactory.createApplicationContext(AppModule, { logger: false, abortOnError: false });
    if (command === 'migrate') {
      const migrations = await app.get(DataSource).runMigrations({ transaction: 'all' });
      console.log(JSON.stringify({ status: 'ok', migrations: migrations.map(item => item.name) }));
    } else {
      console.log(JSON.stringify({ status: 'ok', ...await app.get(CatalogImportService).importFile() }));
    }
  } catch {
    // Source paths/filenames and parser excerpts can contain private operator data.
    console.error('Catalog command failed. Check sanitized input, configuration and database migrations.');
    process.exitCode = 1;
  } finally {
    await app?.close();
  }
}
void main();
