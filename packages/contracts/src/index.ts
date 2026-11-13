/** V1 wire contracts. Only type exports: usable from Nest CJS and both browser hosts. */
export type PermissionType = 'Delegated' | 'Application';
export type DataState = 'not-imported' | 'ready';
export interface SourceInfo {
  fileName: string;
  sha256: string;
  importedAt: string; // ISO 8601 UTC; not the source export timestamp
  classificationVersion: string;
  excludedRscCount: number;
}
export interface Counts {
  permissionCount: number; // merged names in the filtered result
  definitionCount: number; // matching visible definitions, never merged
}
export interface CatalogMetadata {
  dataState: DataState;
  source: SourceInfo | null;
}
export interface ResourceSummary extends Counts {
  resourceId: string; // resource App ID, never the tenant service principal Object ID
  displayName: string;
}
export interface ResourcesResponse extends CatalogMetadata { items: ResourceSummary[]; }
export interface CategorySummary extends Counts {
  category: string; // stable slug, including uncategorized
  displayName: string;
  description: string;
}
export interface CategoriesResponse extends CatalogMetadata, Counts { items: CategorySummary[]; }
export interface DefinitionBase {
  id: string;
  isEnabled: boolean;
  title: string; // official display title, not an AI summary
  description: string; // official admin consent text
  adminConsentRequired: boolean;
}
export interface ApplicationDefinition extends DefinitionBase {
  permissionType: 'Application';
  adminConsentRule: 'application-always-required';
}
export interface DelegatedDefinition extends DefinitionBase {
  permissionType: 'Delegated';
  consentType: 'Admin' | 'User';
  userConsentTitle: string;
  userConsentDescription: string;
  adminConsentRule: 'delegated-consent-type';
}
export type PermissionDefinition = ApplicationDefinition | DelegatedDefinition;
export interface PermissionRow {
  resourceId: string;
  value: string;
  category: string;
  family: string;
  visibleTypes: PermissionType[]; // computed only from matching visible definitions
  definitions: PermissionDefinition[]; // matching visible definitions only
}
export interface PermissionsResponse extends CatalogMetadata, Counts { items: PermissionRow[]; }
export interface PermissionDetailResponse extends CatalogMetadata {
  item: PermissionRow;
  allDefinitions: PermissionDefinition[]; // includes hidden/disabled/nonmatching types
}
export interface PermissionQuery {
  q?: string;
  category?: string;
  family?: string;
  permissionType?: PermissionType;
  adminConsentRequired?: boolean;
  showDisabled?: boolean;
}
/** Nest default exception shape. message is an array for ValidationPipe failures. */
export interface ApiErrorBody { statusCode: number; message: string | string[]; error?: string; }
