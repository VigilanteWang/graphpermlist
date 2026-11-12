import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { PermissionQuery, PermissionType } from '@graph/contracts';

// Preserve invalid values so IsBoolean rejects them; Boolean('false') is forbidden.
const parseBoolean = ({ value }: { value: unknown }): unknown => value === 'true' ? true : value === 'false' ? false : value;
export class EmptyQueryDto {}

export class PermissionQueryDto implements PermissionQuery {
  @IsOptional() @IsString() @MaxLength(500) q?: string;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
  @IsOptional() @IsString() @MaxLength(100) family?: string;
  @IsOptional() @IsIn(['Delegated', 'Application']) permissionType?: PermissionType;
  @IsOptional() @Transform(parseBoolean) @IsBoolean() adminConsentRequired?: boolean;
  @IsOptional() @Transform(parseBoolean) @IsBoolean() showDisabled?: boolean;
}
