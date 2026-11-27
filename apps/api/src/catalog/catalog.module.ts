/** 将目录路由、查询服务和离线导入服务接入 Nest。 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogImportService } from './import/catalog-import.service';
import { CATALOG_ENTITIES } from './catalog.entities';
/** 目录模块。注册目录表的 Repository 供查询服务读取，也让命令行入口能取得导入服务。 */
@Module({ imports: [TypeOrmModule.forFeature(CATALOG_ENTITIES)], controllers: [CatalogController],
  providers: [CatalogService, CatalogImportService], exports: [CatalogService, CatalogImportService] })
export class CatalogModule {}
