import type { CatalogClient, CatalogManifest, CatalogSnapshot, ResourcesResponse } from '@graph/contracts';
import type { CatalogClient as LegacyCatalogClient } from '@graph/api-client';
import { detail } from './catalog.js';

// Types only: not a generated/validated production artifact or a JSON client implementation.
export const snapshot = {
  schemaVersion: 1, version: 'synthetic-v1', classificationHash: '1'.repeat(64),
  source: { fileName: 'synthetic-test-fixture.json', sha256: '0'.repeat(64),
    generatedAt: '2026-11-17T00:00:00Z', classificationVersion: 'test-only', excludedRscCount: 0 },
  resources: [{ resourceId: detail.item.resourceId, displayName: 'Synthetic resource',
    categories: [{ category: 'exchange', displayName: 'Exchange', description: 'Synthetic category' }],
    families: [{ category: 'exchange', family: 'Mail' }], definitions: [] }]
} satisfies CatalogSnapshot;
export const manifest = { schemaVersion: 1, version: 'synthetic-v1',
  snapshot: 'catalog-synthetic-v1.json', artifactSha256: '2'.repeat(64) } satisfies CatalogManifest;
export const jsonResources = { dataState: 'ready', source: snapshot.source, items: [],
  artifact: { schemaVersion: manifest.schemaVersion, version: manifest.version, sha256: manifest.artifactSha256 }
} satisfies ResourcesResponse;
export const legacyCompatible = (client: CatalogClient): LegacyCatalogClient => client;
