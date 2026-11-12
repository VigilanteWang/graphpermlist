import type { PermissionDetailResponse, PermissionRow } from '@graph/contracts';
// Synthetic wire-shape examples ONLY. Never import into the production catalog.
const row = {
  resourceId: '00000003-0000-0000-c000-000000000000', value: 'Mail.Read', category: 'exchange', family: 'Mail',
  visibleTypes: ['Delegated', 'Application'], definitions: [
    { permissionType: 'Delegated', id: '11111111-1111-4111-8111-111111111111', isEnabled: true,
      title: 'Synthetic delegated title', description: 'Synthetic delegated consent message',
      consentType: 'User', userConsentTitle: 'Synthetic user title', userConsentDescription: 'Synthetic user message',
      adminConsentRequired: false, adminConsentRule: 'delegated-consent-type' },
    { permissionType: 'Application', id: '22222222-2222-4222-8222-222222222222', isEnabled: true,
      title: 'Synthetic application title', description: 'Synthetic application consent message',
      adminConsentRequired: true, adminConsentRule: 'application-always-required' }
  ]
} satisfies PermissionRow;
export const detail = {
  dataState: 'ready', source: { fileName: 'synthetic-test-fixture.json', sha256: '0'.repeat(64),
    importedAt: '2026-11-12T00:00:00Z', classificationVersion: 'test-only', excludedRscCount: 0 },
  item: row, allDefinitions: row.definitions
} satisfies PermissionDetailResponse;
