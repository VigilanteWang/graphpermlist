/** 离线迁移和导入的命令行入口，不启动 HTTP 服务器。 */
import 'reflect-metadata';
import { type INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { CatalogImportService } from './catalog/catalog-import.service';

/** CLI 的异步主函数，选择迁移或导入命令，复用 Nest 服务并在结束时关闭连接。 */
async function main(): Promise<void> {
  let app: INestApplicationContext | undefined;
  try {
    const command = process.argv[2];
    if (command !== 'migrate' && command !== 'import') throw new Error('Expected migrate or import');
    // 只创建依赖注入上下文，不启动 HTTP；禁用默认日志以免泄漏本机路径。
    app = await NestFactory.createApplicationContext(AppModule, { logger: false, abortOnError: false });
    if (command === 'migrate') {
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
