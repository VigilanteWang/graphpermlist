/** permission 查询参数的 DTO 文件，包含参数结构及转换和校验规则。 */
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { PermissionQuery, PermissionType } from '@graph/contracts';

/** 布尔查询参数的转换函数，仅转换字符串 true/false，其余值原样保留，交由 IsBoolean 校验。 */
// 不能使用 Boolean('false')，因为非空字符串会被转换成 true。
const parseBoolean = ({ value }: { value: unknown }): unknown => value === 'true' ? true : value === 'false' ? false : value;
/** 不含任何字段的查询参数 DTO，供全局校验拒绝此接口的额外查询参数。 */
export class EmptyQueryDto {}

/** permission 筛选参数的 DTO 类；装饰器在请求进入控制器前限制类型、长度和允许值。 */
export class PermissionQueryDto implements PermissionQuery {
  @IsOptional() @IsString() @MaxLength(500) q?: string;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
  @IsOptional() @IsString() @MaxLength(100) family?: string;
  @IsOptional() @IsIn(['Delegated', 'Application']) permissionType?: PermissionType;
  @IsOptional() @Transform(parseBoolean) @IsBoolean() adminConsentRequired?: boolean;
  @IsOptional() @Transform(parseBoolean) @IsBoolean() showDisabled?: boolean;
}
