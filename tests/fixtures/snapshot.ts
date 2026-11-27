import type { CatalogClient, CatalogJsonManifest, CatalogJsonSnapshot, ResourceListResult } from '@graph/contracts';
import type { CatalogClient as LegacyCatalogClient } from '@graph/api-client';
import { detail } from './catalog.js';

// Types only: not a generated/validated production artifact or a JSON client implementation.
export const snapshot = {
  schemaVersion: 2, version: 'synthetic-release', generatedAt: '2026-11-17T00:00:00Z',
  resources: [{ resourceId: detail.item.resourceId, displayName: 'Synthetic resource',
    browseMode: 'category', classificationHash: '1'.repeat(64),
    source: { fileName: 'synthetic-test-fixture.json', sha256: '0'.repeat(64),
      classificationVersion: 'test-only', excludedRscCount: 0 },
    categories: [{ category: 'exchange', displayName: 'Exchange', description: 'Synthetic category' }],
    families: [{ category: 'exchange', family: 'Mail' }], definitions: [] }]
} satisfies CatalogJsonSnapshot;
export const manifest = { schemaVersion: 2, version: 'synthetic-release',
  snapshot: 'catalog-synthetic-release.json', artifactSha256: '2'.repeat(64) } satisfies CatalogJsonManifest;
export const jsonResources = { dataState: 'ready', source: { ...snapshot.resources[0].source, generatedAt: snapshot.generatedAt }, items: [],
  artifact: { schemaVersion: manifest.schemaVersion, version: manifest.version, sha256: manifest.artifactSha256 }
} satisfies ResourceListResult;
export const legacyCompatible = (client: CatalogClient): LegacyCatalogClient => client;
