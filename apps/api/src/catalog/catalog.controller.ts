/** 目录的只读 HTTP 路由，接收 resource 列表、category 统计、permission 列表和详情请求。 */
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { EmptyQueryDto, PermissionQueryDto } from './permission-query.dto';

/** /api/v1/resources 下的 HTTP 控制器，检查路径和查询参数后把查询交给 CatalogService。 */
@Controller('resources')
export class CatalogController {
  /** 控制器的构造函数，接收 Nest 注入的目录查询服务。 */
  constructor(private readonly catalog: CatalogService) {}

  /** resource 列表的请求入口。空 DTO 表示此路由不接受查询参数。 */
  @Get()
  resources(@Query() _query: EmptyQueryDto) { return this.catalog.resources(); }

  /** category 统计的请求入口。路径提供 resource ID，查询字符串提供计算数量时用的筛选条件。 */
  @Get(':resourceId/categories')
  categories(@Param('resourceId', new ParseUUIDPipe()) resourceId: string, @Query() query: PermissionQueryDto) {
    return this.catalog.categories(resourceId, query);
  }

  /** permission 列表的请求入口。可用 q 搜索，或用 category、permissionType 等字段缩小结果范围。 */
  @Get(':resourceId/permissions')
  permissions(@Param('resourceId', new ParseUUIDPipe()) resourceId: string, @Query() query: PermissionQueryDto) {
    return this.catalog.permissions(resourceId, query);
  }

  /** permission 详情的请求入口。路径中的 value 是 User.Read 这样的 permission 名称。 */
  @Get(':resourceId/permissions/:permissionValue')
  detail(@Param('resourceId', new ParseUUIDPipe()) resourceId: string, @Param('permissionValue') value: string, @Query() query: PermissionQueryDto) {
    return this.catalog.detail(resourceId, value, query);
  }
}
