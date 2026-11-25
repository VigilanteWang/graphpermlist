/** 为 HTTP 服务和命令行入口建立 SQLite 连接，注册目录表及其迁移。 */
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CATALOG_ENTITIES } from '../catalog/catalog.entities';
import { CatalogSchema1794528000000 } from './catalog.migration';

/** 数据库模块。用已校验的 SQLite 路径建立 TypeORM 连接，查询和导入服务复用这一连接。 */
@Module({
  imports: [TypeOrmModule.forRootAsync({
    inject: [ConfigService],
    /** 从 Nest 配置读取 SQLite 路径，生成 TypeORM 建连接时使用的选项。 */
    useFactory: (config: ConfigService) => {
      const database = config.getOrThrow<string>('SQLITE_PATH');
      // 内存数据库无需文件目录；文件数据库先确保父目录存在。
      if (database !== ':memory:') mkdirSync(dirname(database), { recursive: true });
      // 表结构由 npm run db:migrate 更新，启动 API 时只建立连接。
      return { type: 'better-sqlite3' as const, database, entities: CATALOG_ENTITIES, migrations: [CatalogSchema1794528000000], synchronize: false, migrationsRun: false, retryAttempts: 1 };
    }
  })]
})
export class DatabaseModule {}
