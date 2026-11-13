import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

/** Provider-specific configuration stays outside CatalogService. Entities/migrations arrive in #4. */
@Module({
  imports: [TypeOrmModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => {
      const database = config.getOrThrow<string>('SQLITE_PATH');
      if (database !== ':memory:') mkdirSync(dirname(database), { recursive: true });
      return { type: 'better-sqlite3' as const, database, entities: [], migrations: [], synchronize: false, migrationsRun: false, retryAttempts: 1 };
    }
  })]
})
export class DatabaseModule {}
