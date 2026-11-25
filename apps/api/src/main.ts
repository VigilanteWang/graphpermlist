/** 目录 HTTP API 的启动入口，由 npm run start:api 运行编译后的文件。 */
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { createApp } from './bootstrap';

/** HTTP 服务的启动函数。先创建已配置路由的应用，再按 Nest 配置的 HOST 和 PORT 开始监听。 */
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
