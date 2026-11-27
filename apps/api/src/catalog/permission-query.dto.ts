/** 目录 API 接受的查询参数，以及 Nest 在交给控制器前执行的转换和检查。 */
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { PermissionQueryOptions, PermissionType } from '@graph/contracts';

/**
 * URL 中布尔参数的转换规则。例如 showDisabled=false 会得到 false。
 * 只有 true 和 false 两种字符串会被转换，其余值留给 IsBoolean 检查。
 */
const parseBoolean = ({ value }: { value: unknown }): unknown => value === 'true' ? true : value === 'false' ? false : value;
/** 不接受查询参数的接口使用的 DTO，例如 resource 列表。 */
export class EmptyQueryDto {}

/** permission 搜索和筛选参数。每项都可省略，传入时必须符合对应的类型、长度或取值要求。 */
export class PermissionQueryDto implements PermissionQueryOptions {
  @IsOptional() @IsString() @MaxLength(500) q?: string;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
  @IsOptional() @IsString() @MaxLength(256) family?: string;
  @IsOptional() @IsIn(['Delegated', 'Application']) permissionType?: PermissionType;
  @IsOptional() @Transform(parseBoolean) @IsBoolean() adminConsentRequired?: boolean;
  @IsOptional() @Transform(parseBoolean) @IsBoolean() showDisabled?: boolean;
}
