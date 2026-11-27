/** 将目录路由、查询服务和离线导入服务接入 Nest。 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogImportService } from './import/catalog-import.service';
import { CATALOG_ENTITIES } from './catalog.entities';
import { CATALOG_READER } from './read/catalog-reader';
import { TypeOrmCatalogReader } from './read/typeorm-catalog-reader';
/** 目录模块。注册读取适配器与目录表的 Repository，也让命令行入口能取得导入服务。 */
@Module({ imports: [TypeOrmModule.forFeature(CATALOG_ENTITIES)], controllers: [CatalogController],
  providers: [CatalogService, CatalogImportService, { provide: CATALOG_READER, useClass: TypeOrmCatalogReader }], exports: [CatalogService, CatalogImportService] })
export class CatalogModule {}
