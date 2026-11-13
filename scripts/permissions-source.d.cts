export interface RawPermission {
  id: string; value: string; isEnabled: boolean;
  allowedMemberTypes: string[]; origin: string; displayName: string; description: string;
  type: 'Admin' | 'User'; adminConsentDisplayName: string; adminConsentDescription: string;
  userConsentDisplayName: string; userConsentDescription: string;
}
export interface PermissionsSource {
  appId: string; displayName: string; appDisplayName: string;
  appRoles: RawPermission[]; oauth2PermissionScopes: RawPermission[];
  resourceSpecificApplicationPermissions: RawPermission[];
}
export const DEFAULT_PERMISSIONS_SOURCE: string;
export const SNAPSHOT_SHA256: string;
export function validatePermissionsData(data: unknown): Record<string, unknown>;
export function loadPermissionsSource(options?: {source?: string; expectedSha256?: string}): Promise<{
  data: PermissionsSource; sourcePath: string; sha256: string; counts: Record<string, unknown>;
}>;
