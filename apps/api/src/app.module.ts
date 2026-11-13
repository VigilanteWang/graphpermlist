import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './configuration';
import { DatabaseModule } from './database/database.module';
import { CatalogModule } from './catalog/catalog.module';

@Controller('health')
class HealthController {
  @Get() health() { return { status: 'ok', stage: 'catalog-api' }; }
}
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }), DatabaseModule, CatalogModule],
  controllers: [HealthController]
})
export class AppModule {}
