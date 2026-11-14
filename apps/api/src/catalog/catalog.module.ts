import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogImportService } from './catalog-import.service';
import { CATALOG_ENTITIES } from './catalog.entities';
@Module({ imports: [TypeOrmModule.forFeature(CATALOG_ENTITIES)], controllers: [CatalogController],
  providers: [CatalogService, CatalogImportService], exports: [CatalogService, CatalogImportService] })
export class CatalogModule {}
