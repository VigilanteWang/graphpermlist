/** resource 和 permission 的只读 HTTP 控制器文件，包含路由及参数声明。 */
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { EmptyQueryDto, PermissionQueryDto } from './permission-query.dto';

/** 目录的 HTTP 控制器，接收 /resources 下的请求并调用查询服务。 */
@Controller('resources')
export class CatalogController {
  /** 控制器的构造函数，接收 Nest 注入的目录查询服务。 */
  constructor(private readonly catalog: CatalogService) {}

  /** resource 列表的路由处理方法；空 DTO 配合全局校验限制此接口的查询参数。 */
  @Get()
  resources(@Query() _query: EmptyQueryDto) { return this.catalog.resources(); }

  /** category 统计的路由处理方法，校验 resource ID 为 UUID 后查询当前筛选结果。 */
  @Get(':resourceId/categories')
  categories(@Param('resourceId', new ParseUUIDPipe()) resourceId: string, @Query() query: PermissionQueryDto) {
    return this.catalog.categories(resourceId, query);
  }

  /** permission 列表的路由处理方法，筛选参数由 DTO 转换和校验。 */
  @Get(':resourceId/permissions')
  permissions(@Param('resourceId', new ParseUUIDPipe()) resourceId: string, @Query() query: PermissionQueryDto) {
    return this.catalog.permissions(resourceId, query);
  }

  /** permission 详情的路由处理方法，按路径中的 value 和查询字符串中的筛选条件查询。 */
  @Get(':resourceId/permissions/:permissionValue')
  detail(@Param('resourceId', new ParseUUIDPipe()) resourceId: string, @Param('permissionValue') value: string, @Query() query: PermissionQueryDto) {
    return this.catalog.detail(resourceId, value, query);
  }
}
