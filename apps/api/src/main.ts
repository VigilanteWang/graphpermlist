/** 目录 HTTP API 的程序入口，负责启动应用并报告启动失败。 */
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { createApp } from './bootstrap';

/** HTTP 服务的异步启动函数，创建应用并按已校验的 HOST 和 PORT 监听请求。 */
async function main(): Promise<void> {
  const app = await createApp();
  const config = app.get(ConfigService);
  await app.listen(config.getOrThrow<number>('PORT'), config.getOrThrow<string>('HOST'));
}
// 启动失败时设置非零退出码，便于终端或进程管理工具识别失败。
main().catch((error: unknown) => {
  Logger.error(error instanceof Error ? error.message : 'API startup failed', undefined, 'Bootstrap');
  process.exitCode = 1;
});
