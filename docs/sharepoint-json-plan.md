# SharePoint JSON increment

Parent: [#11](https://github.com/VigilanteWang/graphpermlist/issues/11).
Latest issue bodies are authoritative; this file records decisions and evidence.
The [V1 plan](implementation-plan.md) remains historical. No previous SharePoint
runtime gap is reclassified as passed by this increment.

## Sequential stages

1. [#12](https://github.com/VigilanteWang/graphpermlist/issues/12): neutral client,
   snapshot contracts, pure query core and existing-entry regression (this PR).
2. [#13](https://github.com/VigilanteWang/graphpermlist/issues/13): offline export,
   validation, publication files and browser JSON client. Not started.
3. [#14](https://github.com/VigilanteWang/graphpermlist/issues/14): second independent
   JSON SPFx solution and three-entry shared UI integration. Not started.
4. [#15](https://github.com/VigilanteWang/graphpermlist/issues/15): independent review,
   clean reproduction and actual dual-SPFx runtime acceptance. Not started.

Each stage starts from verified latest main after its predecessor PR merges. Use
one codex/ branch and PR per stage. No merge, issue closure, tenant upload, permission
change or deployment is authorized by successful checks. Stop after each stage.

## Product and code boundaries

The website and existing API SPFx retain HTTP clients. A future JSON SPFx is a
second solution, with independent solution/Web Part GUIDs, package name, outputs,
configuration and upgrade/rollback. A data-source switch in one Web Part does not
satisfy #11. Three entries reuse packages/ui and inject a CatalogClient; UI has no
transport/host branches. Current API SPFx IDs/properties/package are unchanged.

- contracts: type-only CatalogClient, current wire responses, query inputs and
  schema 1 publication types. api-client retains its old CatalogClient type export.
- api-client: unchanged HTTP routes, encoding, credentials: omit, status/errors and
  request cancellation. No SPFx context.
- catalog-core: pure queryPermissions/countPermissions/queryCategories/queryDetail.
  Input is validated ordinary definitions from one resource. No IO, crypto, clock,
  database, identity, React, Nest or SPFx runtime. No schema validator/client yet.
- API CatalogService: TypeORM reads and activity lookup, adapting plain structures
  to core and mapping absent detail/resource to existing Nest 404 responses.
- UI: neutral client, source-neutral load/error/setup descriptions; source details
  display importedAt for API and generatedAt for JSON without inventing timestamps.
- Future offline tool owns transformation/classification/export. Future SPFx host
  owns SPHttpClient, file URL policy, permissions, configuration, React and theme.
  JSON runtime requires no Nest/SQLite/customer Azure resources.

All query filters act on the same definition before value merging. Same-type,
same-value definitions with different GUIDs survive. Counts and visibleTypes use
matching definitions; detail.allDefinitions retains all definitions of the exact
case-sensitive value. Disabled is hidden by default; upstream validation/import
excludes RSC. Unknown category/family yields no matches. Text sorting remains JS
lexical ordering; definitions sort by type, with stable input order within a type.

## Schema 1 decisions for #13

Types: packages/contracts/src/index.ts. These are contracts, not runtime validation.

- CatalogManifest: schemaVersion: 1, version, snapshot, artifactSha256.
  snapshot is a filename relative to the configured manifest directory, such as
  catalog-<version>.json. Version/path validation must reject absolute URLs,
  schemes, encoded separators, dot segments and directory escape. The host can
  configure a different site path on its own origin with real file access.
- CatalogSnapshot: schemaVersion: 1, version, source, classificationHash, resources.
  Each resource includes resourceId (Resource App ID), displayName, categories,
  category/family pairs and definitions. Each definition has value/category/family,
  the current PermissionDefinition and safe rawDefinition fields (Application
  allowedMemberTypes/origin/displayName/description; Delegated type/admin/user
  consent fields). Do not retain tenant/object/credential fields. Validation must
  check raw/normalized field agreement, type/consent/enabled rules and references.
- Definition identity is resourceId + permissionType + GUID. Display row identity
  is resourceId + value. Same value must have consistent category/family. Distinct
  GUIDs must never be deduplicated by value. Resource/category/family identifiers
  and references must be validated before any core query.
- source.sha256 hashes original input bytes; source.fileName is a safe logical
  name, never a private input path. source.classificationVersion and top-level
  classificationHash identify classification; source.excludedRscCount traces RSC.
- source.generatedAt is the actual offline generation timestamp (UTC ISO 8601),
  not an official export time. JSON has no importedAt; the existing API source
  continues to contain its real database importedAt and unchanged field values.
  Deterministic reproduction requires the same input/rules/schema/generation
  timestamp; #13 must provide an explicit reproducible timestamp input.
- manifest.artifactSha256 is lowercase SHA256 over the exact snapshot file bytes,
  not the parsed/re-serialized object. Keep it outside the snapshot to avoid a
  circular self-digest. The client adds optional CatalogMetadata.artifact with
  schemaVersion/version/sha256 only after validation; API need not emit it.
- Manifest and snapshot schema/version must agree. An unsupported schema, invalid
  shape, duplicate identity, inconsistent reference/raw fields or digest mismatch
  rejects the candidate. No fallback to empty directory on corrupt/missing data.
  Static types do not establish runtime trust; unknown fields also need policy.
- #13 should set and document finite byte/record/string/depth limits based on the
  measured source, with tests at boundaries and explanations. Current input counts
  are acceptance evidence, never schema requirements for future valid catalogs.

CatalogFailure.code defines load-failed (network/status/non-JSON/login HTML),
invalid-snapshot (format/reference/digest/version), unsupported-schema and not-found.
Future JSON errors reject promises; cancellation uses AbortError and stale requests
cannot publish state. HTTP retains CatalogApiError with original status/body.
not-imported is the existing API's migrated/unimported database state; it is not a
JSON read-failure fallback. A valid zero-result query is ready with empty items.

A session pins one fully validated snapshot. Search/filter/detail reuse it without
new downloads. Explicit refresh rereads manifest, loads/verifies a candidate and
atomically replaces only in-memory state on success; failure keeps the last valid
snapshot with an observable error. Concurrent loads, cancel/retry and stale results
must not mix versions. Initially no persistent/offline cache is required.

Offline publication order: validate -> upload immutable snapshot -> confirm readable
-> switch current.json last. Rollback switches to a previously valid version. No
SharePoint multi-file transaction is assumed. Digest checks integrity, not publisher
trust or authorization. Upload/permission/runtime testing still needs separate user
authorization and an actual designated test environment.

## Module and build decisions

catalog-core compiles one source twice: ESM under dist/esm and CommonJS under
dist/cjs with a generated package marker. Conditional exports select import/require
and corresponding declarations. main/module/types also support the current SPFx
node-resolution tooling. There is no handwritten second query implementation.
Node API remains CommonJS; contracts remain type-only imports; no sync require(ESM)
feature or top-level await assumption is needed. Browser core is compiled with
ES2020/DOM and types: [] so Node ambient types are unavailable. Other hosts retain
their existing TS configurations. No global toolchain override or dependency upgrade.
Root npm ci still installs the entire workspace, including backend/tooling packages.

Checks recurse through shared source ASTs and runtime manifests, rejecting
unapproved packages, Node builtins, host/identity imports and relative escapes.
Both compiled core exports must be runtime-dependency-free. React remains a UI peer
provided by each host. Existing SPFx package and React manifest checks still apply.
[Microsoft compatibility reference](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/compatibility)
was rechecked: retain SPFx 1.24.1, React 18.3.1 and pinned Node 22.16.0/TS 5.8.3.
This stage does not add a JSON Web Part or claim a second package already exists.

## Stage 1 baseline and verification — 2026-11-17

Fetched live #11/#12, related #2/#6 and PR #10 metadata. git fetch origin confirmed
HEAD = origin/main = c6310f38e138138901966a219b94b2f3948f2f1f, the #10 merge.
Only one worktree existed. The pre-existing implementation-plan research/planning
appendices were retained, then codex/spfx-json-1-query-core was created from main.
No source/database/service changes existed at start. Current AGENTS.md reflects #11
without overwriting V1 history. Main model cannot be independently verified/switched
through current tools; no global settings changed. A bounded Sol/medium test author
and read-only reviewer was explicitly launched; main owns integration/manifests/Git.

Verification results and publication identifiers will be appended below after checks.

### Stage 1 results

Node 22.16.0 / npm 10.9.2, macOS arm64; commands run at repository root:

| Command/check | Verified result |
| --- | --- |
| npm ci | Passed initially and after local workspace lock update; final 1,425 packages. No registry version changes. |
| npm run verify:data | Passed pinned source SHA256; Application 788, Delegated 876, disabled 4, excluded RSC 60. |
| npm run typecheck | Passed all packages and fixtures; new snapshot/legacy-client fixture also passed `npx tsc -p tsconfig.tests.json`. |
| npm test | 26 passed, 0 failed. Existing real-source HTTP oracle, transaction/CLI tests plus 12 explicit ESM/CJS synthetic query tests. |
| npm run build | Passed shared/API/Vite and existing SPFx production lint/build/package. Existing host IDs/properties and build configurations unchanged. |
| npm run check:react | Passed React 18.3.1/manifest and recursive shared dependency checks; both core outputs have no runtime imports. |
| Boundary negative probes | Four nested temporary probes rejected Node builtin, Nest import, relative escape and dynamic nonliteral import; probes removed and clean check passed. |
| node docs/verification/spfx-json-1/runtime-check.mjs | Passed isolated file SQLite migration/import/reuse plus new real CommonJS API process. All four routes, original source shape, counts/GUID/consent/400/404/CORS/OPTIONS verified. Process/database cleaned up. |
| CATALOG_TEST_API_PORT=3216 CATALOG_TEST_WEB_PORT=5316 npm run test:browser | 26/26 Chromium passed (29.8s), including real browser core ESM and neutral generation-time metadata. Existing services and local database were not used or stopped. |
| Chinese comment / diff checks | 8 changed source modules, 78/78 named declarations have Chinese TSDoc/JSDoc plus headers. Manual purpose/rules/data-flow/domain-term accuracy review and git diff --check passed. |

[Sanitized command logs, runtime helper and package hash](verification/spfx-json-1/).
[Actionable human-review checklist](verification/spfx-json-1-human-review.md).
The core test author also performed a bounded read-only final review of contracts,
core/provider and UI compatibility; no concrete remaining issue found. Main agent
reviewed integration, lock changes, source comments and retained artifact hygiene.
The only post-build source edit was clarification of Chinese type comments; no
runtime/type behavior changed, so unrelated checks were not repeated.

Initial added browser test collection failed because import.meta.url interacted with
Playwright's CommonJS transformation; fixed the test-only path derivation. Chromium
then could not initialize under macOS sandbox MachPort restrictions; an approved
full rerun passed. See execution-limitations.txt. Upstream install deprecations,
Vite chunk-size warning and Heft zero Web Part Jest suites persist. Browser baseline
versions beyond installed Chromium, other OS/platforms and hosted CI are unverified.
SPFx packaging is successful, but actual SharePoint runtime remains unverified.

This stage deliberately delivers one existing API SPFx package, not a second/JSON
package; those #11 deliverables belong to #14. JSON validators/export/loader/refresh,
file permissions/HTML/digest failure handling and publication/rollback are contracts
only here and require implementation in #13. No tenant access, uploads, permissions,
app registrations, deployment, merge, issue closure or next-stage work performed.
