import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { EmptyQueryDto, PermissionQueryDto } from './permission-query.dto';

@Controller('resources')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  resources(@Query() _query: EmptyQueryDto) { return this.catalog.resources(); }

  @Get(':resourceId/categories')
  categories(@Param('resourceId', new ParseUUIDPipe()) resourceId: string, @Query() query: PermissionQueryDto) {
    return this.catalog.categories(resourceId, query);
  }

  @Get(':resourceId/permissions')
  permissions(@Param('resourceId', new ParseUUIDPipe()) resourceId: string, @Query() query: PermissionQueryDto) {
    return this.catalog.permissions(resourceId, query);
  }

  @Get(':resourceId/permissions/:permissionValue')
  detail(@Param('resourceId', new ParseUUIDPipe()) resourceId: string, @Param('permissionValue') value: string, @Query() query: PermissionQueryDto) {
    return this.catalog.detail(resourceId, value, query);
  }
}
