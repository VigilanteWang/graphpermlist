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

The root `.env.example` documents PORT, HOST, CORS_ORIGINS, SQLITE_PATH and
PERMISSIONS_SOURCE. Copy to `.env` only when changing defaults. Both CLI and HTTP
load the same ConfigModule, DatabaseModule, entities and CatalogModule. Paths in
environment variables resolve relative to the command's working directory, except
the default input which resolves from the repository's scripts directory.
Never commit `.env`, original tenant exports or generated SQLite files.

## Migration and import

- `npm run db:migrate` uses a Nest application context and TypeORM's versioned
  migration history. Repeating it applies no additional schema changes.
  `synchronize` and automatic startup migrations remain disabled.
- `npm run import:data` uses CatalogImportService in a Nest application context.
  It does not start HTTP and closes the connection in `finally`, including failures.
  Run migration first; missing schema is an error, not an unimported empty catalog.
- Default input: `data/commercial-graph-permlist.json`; its SHA256 is independently
  pinned. For a reviewed replacement use `PERMISSIONS_SOURCE=./data/replacement.json`.
  Optionally set `PERMISSIONS_SHA256` to an expected digest. Validate and sanitize
  replacements before import; the parser rejects unknown tenant/credential fields,
  missing/empty collections, malformed definitions and duplicate GUIDs within a type.
  Definition identity is type + GUID, so different GUIDs sharing a value are preserved.
  Counts are calculated from the input, never constrained to the current snapshot totals.
- Only appRoles allowing Application and ordinary delegated scopes are imported.
  User/group-only roles are skipped. RSC is counted separately and excluded.
- Each successful changed snapshot records a new immutable version with the source
  digest, import timestamp and classification version. Original safe fields are stored
  alongside the normalized API fields. Reimporting the active source/classification
  returns the existing version without changing its import timestamp or counts.
- All definitions, categories and families are written before the active-version
  pointer changes, in one transaction. Both partial-write and publication failures
  roll back. Historical versions remain stored; no cleanup or rollback CLI is shipped.
  Import calls within one application context are serialized for SQLite's connection.
  Cross-process contention can fail; rerun the command after the other writer finishes.
- Source metadata publishes the logical name `commercial-graph-permlist.json`, not
  the operator's filename/path. SHA256 distinguishes replacements. CLI failures use
  a fixed message and nonzero exit status, including initialization failures.

SQLite-specific DDL/indexes live in `apps/api/src/database/catalog.migration.ts`;
connection options live in DatabaseModule. Business queries use injected TypeORM
repositories and are independent of HTTP. A SQL Server provider is not implemented
or validated in this stage.

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

The default source is `data/commercial-graph-permlist.json`. For a reviewed
replacement, pass `PERMISSIONS_SOURCE=./data/replacement.json` in the command
environment and optionally pin `PERMISSIONS_SHA256`. Export reads these environment
variables directly. It reports a fixed logical source name and preserves the input.
`./release/catalog` is gitignored.

- `catalog-<version>.json` contains the schema 1 snapshot. Its version is derived
  from the snapshot payload, including `source.generatedAt`. The timestamp defaults
  to the current UTC time. Repeating with identical input and code and
  `--generated-at 2026-11-20T00:00:00.000Z` reproduces both files byte for byte.
- `current.json` points to the versioned filename and stores the SHA-256 of its
  exact file bytes. The separate `source.sha256` records the input digest.
  `generatedAt` records export time. SQLite continues to record `importedAt`.
- Local export stages and verifies both files, then adds the snapshot to the
  destination on the same filesystem. Identical snapshots can be reused. A collision
  with different bytes fails. Replacing `current.json` is the final local step.
  Keep old version files for rollback. A failure before pointer replacement can
  leave an unreferenced, valid version file.

### Manual switch and rollback in SharePoint

Use a designated, authorized document library and confirm file access as an
intended reader. Keep the old manifest for rollback.

1. Generate and verify the pair locally. Upload the new versioned snapshot first
   to the configured directory, leaving the previous version readable.
2. Read the new file back with the intended access. Verify the downloaded bytes
   and the candidate manifest with `npm run verify:json -- --output ./release/readback`.
3. Update `current.json` only after the new snapshot is readable and verified.
   Explicitly refresh the client and check its artifact version. Separate uploads
   can fail independently.
4. To roll back, verify the previous immutable file and saved manifest, then
   upload that manifest as `current.json`. Refresh and confirm the previous version.

The browser loader resolves the two filenames within the host's configured
directory. It should enforce the host's allowed origin and redirect policy,
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
