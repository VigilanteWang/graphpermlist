/** Nest 应用的根模块文件，包含配置、数据库、目录模块和健康检查。 */
import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './configuration';
import { DatabaseModule } from './database/database.module';
import { CatalogModule } from './catalog/catalog.module';

/** HTTP 健康检查控制器，用于确认应用可以响应请求。 */
@Controller('health')
class HealthController {
  /** 健康检查方法，返回固定存活状态；不代表目录已导入或数据库内容完整。 */
  @Get() health() { return { status: 'ok', stage: 'catalog-api' }; }
}
/** HTTP 与 CLI 共用的 Nest 根模块，注册全局环境配置、数据库及目录功能。 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }), DatabaseModule, CatalogModule],
  controllers: [HealthController]
})
export class AppModule {}
