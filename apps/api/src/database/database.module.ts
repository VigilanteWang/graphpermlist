/** Nest 数据库模块文件，包含 TypeORM 连接及显式迁移的注册信息。 */
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CATALOG_ENTITIES } from '../catalog/catalog.entities';
import { CatalogSchema1794528000000 } from './catalog.migration';

/** 负责数据库连接的 Nest 模块，将 SQLite 配置与业务查询隔离。 */
@Module({
  imports: [TypeOrmModule.forRootAsync({
    inject: [ConfigService],
    /** TypeORM 连接选项的工厂函数，从已校验配置构造选项；迁移通过 CLI 显式执行。 */
    useFactory: (config: ConfigService) => {
      const database = config.getOrThrow<string>('SQLITE_PATH');
      // 内存数据库无需文件目录；文件数据库先确保父目录存在。
      if (database !== ':memory:') mkdirSync(dirname(database), { recursive: true });
      // 禁止按实体自动同步表结构，也不在应用启动时自动迁移。
      return { type: 'better-sqlite3' as const, database, entities: CATALOG_ENTITIES, migrations: [CatalogSchema1794528000000], synchronize: false, migrationsRun: false, retryAttempts: 1 };
    }
  })]
})
export class DatabaseModule {}
