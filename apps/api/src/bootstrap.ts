/** 创建 Nest HTTP 应用，供 API 启动入口和集成测试使用。 */
import 'reflect-metadata';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/** 将目录路由挂在 /api/v1 下，设置查询参数校验规则和允许调用 API 的浏览器来源。 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1');
  // 查询字符串先按 DTO 转换，例如 showDisabled=false 会变成布尔值。拼错或未声明的参数会被拒绝。
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  app.enableCors({ origin: app.get(ConfigService).getOrThrow<string[]>('CORS_ORIGINS'), methods: ['GET'] });
}
/** 配置好路由的 Nest HTTP 应用，由调用方决定何时开始监听端口。 */
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  // 收到终止信号时执行 Nest 清理流程，包括关闭数据库连接。
  app.enableShutdownHooks();
  return app;
}
