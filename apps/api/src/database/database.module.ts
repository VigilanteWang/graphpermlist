import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CATALOG_ENTITIES } from '../catalog/catalog.entities';
import { CatalogSchema1794528000000 } from './catalog.migration';

/** Provider-specific configuration stays outside business services. */
@Module({
  imports: [TypeOrmModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => {
      const database = config.getOrThrow<string>('SQLITE_PATH');
      if (database !== ':memory:') mkdirSync(dirname(database), { recursive: true });
      return { type: 'better-sqlite3' as const, database, entities: CATALOG_ENTITIES, migrations: [CatalogSchema1794528000000], synchronize: false, migrationsRun: false, retryAttempts: 1 };
    }
  })]
})
export class DatabaseModule {}
