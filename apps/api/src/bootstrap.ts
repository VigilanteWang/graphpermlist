/** HTTP 应用的创建与配置模块，供正式入口与集成验证复用。 */
import 'reflect-metadata';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/** HTTP 应用的统一配置函数，设置路由前缀、查询参数校验及允许访问的前端来源。 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1');
  // 先转换 DTO，再拒绝未声明参数，避免无效筛选悄悄生效。
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  app.enableCors({ origin: app.get(ConfigService).getOrThrow<string[]>('CORS_ORIGINS'), methods: ['GET'] });
}
/** Nest HTTP 应用的异步工厂函数，返回配置完成的应用；监听端口由调用方负责。 */
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  // 收到终止信号时执行 Nest 清理流程，包括关闭数据库连接。
  app.enableShutdownHooks();
  return app;
}
