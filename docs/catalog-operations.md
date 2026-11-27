# Local catalog operations

Run from the repository root with the pinned Node/npm versions. No database server,
Docker, tenant credentials or Graph connection is required.

```sh
npm ci
npm run verify:data
npm run build:shared
npm run build:api
npm run db:migrate
npm run import:data
npm run start:api
```

Keep the API terminal running. In a second terminal run `npm run dev:web`.
The website uses the HTTP API for the shared catalog browsing UI.

The root `.env.example` documents HTTP, SQLite, and catalog input settings.
Both CLI and HTTP use the same Nest configuration. Export, validation, and
sanitization are standalone Node commands. Pass their variables in the command
environment. Paths supplied in variables resolve from the working directory.
The default manifest is `data/catalog-resources.json`, resolved from the
installed source workspace. Keep original exports and SQLite databases local.

## Migration and import

- `npm run db:migrate` applies versioned SQLite migrations. The #18 migration
  adds a browse mode to existing snapshots with a category default. Running it
  again applies only pending migrations. The API still uses `synchronize: false`
  and explicit migrations.
- `npm run import:data` validates and models every configured input before one
  SQLite transaction writes the batch. The default manifest pins Microsoft
  Graph, Power BI Service and SharePoint Online. Supply `PERMISSIONS_CONFIG`
  to use a different manifest. See [source documentation](../data/README.md).
- An explicit `PERMISSIONS_SOURCE` imports a single Graph input. Optionally
  pin it using `PERMISSIONS_SHA256`. Use a fresh database to review Graph by
  itself. Each import updates the named resources and leaves other active
  resources in the same database available.
- The importer keeps original official fields and disabled definitions.
  It excludes user-only appRoles and counts RSC separately. An unchanged
  active resource retains its version ID and import timestamp, while changed
  resources receive new versions. A failed batch leaves previous active
  versions available. In-process writes are serialized per connection.
- Import results report a per-resource version ID and reuse flag in manifest
  mode. The command closes its connection on success or failure. Source metadata
  uses the configured logical filename. Explicit Graph imports use
  `commercial-graph-permlist.json` for source display.

`TypeOrmCatalogReader` resolves an active version and maps its categories,
families, and definitions using that version ID. `CatalogService` consumes
plain snapshots and calls the shared query package. SQLite DDL remains in
`apps/api/src/database/`.

## Read-only API examples

```sh
curl http://localhost:3000/api/v1/resources
curl http://localhost:3000/api/v1/resources/00000003-0000-0000-c000-000000000000/categories
curl 'http://localhost:3000/api/v1/resources/00000003-0000-0000-c000-000000000000/permissions?q=Mail.Read&showDisabled=false'
curl http://localhost:3000/api/v1/resources/00000003-0000-0000-c000-000000000000/permissions/Mail.Read
```

Use `permissionType=Application&adminConsentRequired=false` to verify an empty
result rather than accidentally matching a delegated definition's consent rule.
Search a permission GUID to match just that definition, then fetch the same detail
with that query: `item.definitions` is the matching subset and `allDefinitions`
retains all types, GUIDs, official text and enabled states.

A migrated database without an import returns `not-imported` from `/resources`;
per-resource routes return 404. Imported searches with no results return `ready`
with zero counts. An unmigrated or broken database returns a normal 500 response,
not an empty success. See [API contract](api-contract.md) for full semantics and
[classification](classification.md) for editorial rules and unresolved families.

Application admin consent always maps to required. Delegated `Admin`/`User` maps
to required/not required, retaining user consent text. Tenant policies can restrict
user consent further; this offline catalog cannot establish actual consentability.

## Offline JSON publication

Run from the repository root with the pinned Node and npm. The export builds the
shared catalog code and validates the same sanitized source as SQLite import.
API, SQLite and SharePoint are unnecessary for generating or verifying files.

```sh
npm run export:json -- --output ./release/catalog
npm run verify:json -- --output ./release/catalog
```

Use the resource manifest and schema 2 for new publications. This is the default
export format. A snapshot's
`generatedAt` applies to the entire release. Each resource supplies its browse
mode, source file SHA-256, classification version/hash, and excluded RSC count.
SQLite reports a separate `importedAt` for each resource.

```sh
PERMISSIONS_SOURCE=./data/commercial-graph-permlist.json \
  npm run export:json -- --output ./release/graph-only --generated-at 2026-11-20T00:00:00.000Z
npm run verify:json -- --output ./release/graph-only
```

For legacy consumers, explicit Graph export emits schema 1, using the same bytes as #13 for identical
input and generation time. Both formats derive the version from content.
`current.json` points to the versioned basename and records the separate
SHA-256 over the exact snapshot file bytes. For reproducible output, use fixed
inputs, classification and `--generated-at`.

Local export stages and verifies both files, publishes the immutable snapshot,
then replaces `current.json`. Identical version files can be reused. A collision
with different bytes fails and preserves the previous pointer. Keep verified
version files and manifests for rollback. Update consumers to the reader that
accepts schema 1 and 2 before switching a shared pointer to schema 2.

[#14](https://github.com/VigilanteWang/graphpermlist/issues/14) tracks retiring
schema 1 publication and reading after inventorying callers, active manifests and
rollback files. If an active legacy release exists, switch it to a verified schema
2 pair and confirm that its readers can load it. Keep the previous verified
schema 2 release available as a rollback target. The standalone Graph SQLite
input remains available through `PERMISSIONS_SOURCE`.

### Manual switch and rollback in SharePoint

Use a designated, authorized document library and confirm file access as an
intended reader. Save the previous verified schema 2 manifest for rollback.

1. Generate and verify the pair locally. Upload the new versioned snapshot first
   to the configured directory, leaving the previous version readable.
2. Read the new file back with the intended access. Verify the downloaded bytes
   and the candidate manifest with `npm run verify:json -- --output ./release/readback`.
3. Update `current.json` only after the new snapshot is readable and verified.
   Explicitly refresh the client and check its artifact version. Separate uploads
   can fail independently.
4. To roll back, verify the previous immutable file and saved manifest, then
   upload that manifest as `current.json`. Refresh and confirm the previous version.

The browser loader resolves the two filenames within the frontend's configured
directory. It should enforce the frontend's allowed origin and redirect policy,
use the current user's read permissions, and bypass or revalidate HTTP caching
for `current.json`. It supplies a streaming `Response` and passes the provided
signal to the transport. The client checks its status, bytes, schema, references
and digest. It pins the verified version in memory and reads files again on
explicit `refresh()`. A failed refresh leaves the previous version usable.
Browser digest verification uses Web Crypto in a secure context such as HTTPS
or localhost.

The manifest uses a single `catalog-<version>.json` basename. The implementation
caps the manifest at 4 KiB and snapshot at 16 MiB, with up to 32 resources,
256 categories and 2,048 families per resource, and 20,000 definitions total.
Labels and official text are capped at 256 and 8,192 UTF-16 code units, respectively.
An appRole has at most 32 member entries. Each schema level permits a fixed set of
fields and value types. These ceilings
leave room beyond the current catalog and bound allocation and validation work.
Digest verification checks integrity of the bytes. SharePoint permissions and
trusted publishers establish access and provenance.
