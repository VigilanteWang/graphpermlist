/** 本地 SQLite 的命令行入口，供 npm run db:migrate 和 npm run import:data 使用。 */
import 'reflect-metadata';
import { type INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { CatalogImportService } from './catalog/catalog-import.service';

/** 命令行主函数。migrate 更新 SQLite 表结构，import 读取本地 permission 文件并写入目录。 */
async function main(): Promise<void> {
  let app: INestApplicationContext | undefined;
  try {
    const command = process.argv[2];
    if (command !== 'migrate' && command !== 'import') throw new Error('Expected migrate or import');
    // 通过 Nest 取得数据库连接和导入服务即可执行命令。关闭 Nest 日志，避免在错误输出里暴露本机路径。
    app = await NestFactory.createApplicationContext(AppModule, { logger: false, abortOnError: false });
    if (command === 'migrate') {
      // 本次待执行的迁移放在同一个事务中，成功后输出实际执行的迁移名称。
      const migrations = await app.get(DataSource).runMigrations({ transaction: 'all' });
      console.log(JSON.stringify({ status: 'ok', migrations: migrations.map(item => item.name) }));
    } else {
      console.log(JSON.stringify({ status: 'ok', ...await app.get(CatalogImportService).importFile() }));
    }
  } catch {
    // 路径、文件名和解析片段可能含私人信息，对外只输出固定错误说明。
    console.error('Catalog command failed. Check sanitized input, configuration and database migrations.');
    process.exitCode = 1;
  } finally {
    // 成功或失败都释放数据库连接，使 CLI 能正常退出。
    await app?.close();
  }
}
void main();
