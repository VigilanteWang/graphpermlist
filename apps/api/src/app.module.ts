/** HTTP 服务和导入命令从这里注册配置、SQLite 连接和目录功能。 */
import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './configuration';
import { DatabaseModule } from './database/database.module';
import { CatalogModule } from './catalog/catalog.module';

/** HTTP 健康检查控制器，用于确认应用可以响应请求。 */
@Controller('health')
class HealthController {
  /** GET /api/v1/health 的响应。只要 HTTP 服务能响应，就返回固定的 ok，即使目录还没导入。 */
  @Get() health() { return { status: 'ok', stage: 'catalog-api' }; }
}
/** HTTP 与 CLI 共用的 Nest 根模块，注册全局环境配置、数据库及目录功能。 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }), DatabaseModule, CatalogModule],
  controllers: [HealthController]
})
export class AppModule {}
