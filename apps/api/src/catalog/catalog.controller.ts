import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { EmptyQueryDto, PermissionQueryDto } from './permission-query.dto';

@Controller('resources')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  resources(@Query() _query: EmptyQueryDto) { return this.catalog.resources(); }

  @Get(':resourceId/categories')
  categories(@Param('resourceId', new ParseUUIDPipe()) resourceId: string, @Query() _query: PermissionQueryDto) {
    return this.catalog.requireImportedResource(resourceId);
  }

  @Get(':resourceId/permissions')
  permissions(@Param('resourceId', new ParseUUIDPipe()) resourceId: string, @Query() _query: PermissionQueryDto) {
    return this.catalog.requireImportedResource(resourceId);
  }

  @Get(':resourceId/permissions/:permissionValue')
  detail(@Param('resourceId', new ParseUUIDPipe()) resourceId: string, @Param('permissionValue') _value: string, @Query() _query: PermissionQueryDto) {
    return this.catalog.requireImportedResource(resourceId);
  }
}
