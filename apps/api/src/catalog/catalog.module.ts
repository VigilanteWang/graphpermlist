/** 目录功能的 Nest 模块文件，包含实体、控制器和服务的注册信息。 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogImportService } from './catalog-import.service';
import { CATALOG_ENTITIES } from './catalog.entities';
/** 目录功能模块，注册实体仓储和 HTTP 控制器，并导出查询及导入服务。 */
@Module({ imports: [TypeOrmModule.forFeature(CATALOG_ENTITIES)], controllers: [CatalogController],
  providers: [CatalogService, CatalogImportService], exports: [CatalogService, CatalogImportService] })
export class CatalogModule {}
