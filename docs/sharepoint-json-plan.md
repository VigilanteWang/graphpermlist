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

### Stage 1 publication and stop

Implementation/evidence commit:
[ac70855](https://github.com/VigilanteWang/graphpermlist/commit/ac70855115ed9dc53668e4e265bffaf6bd0d78c2).
[PR #16](https://github.com/VigilanteWang/graphpermlist/pull/16) targets main from
codex/spfx-json-1-query-core and is Ready for review. Published the actionable
[#12 human-review checklist](https://github.com/VigilanteWang/graphpermlist/issues/12#issuecomment-6951418159),
including prerequisites, exact commands/actions, expected counts/behavior, isolated
data handling, pending runtime scope and pass/change-needed/blocked reporting.
The same checklist is retained locally above. Pre-existing research/planning notes
in the V1 plan were preserved in the implementation commit.

This publication follow-up changes documentation only. Relative links, retained
path/privacy scan and full commit-range whitespace checks pass; no runtime rerun
is warranted. The implementation, required local verification and #12 handoff are
complete. #11 remains an ongoing increment and actual SharePoint is still pending.
User review and merge are next; after that, verify updated main and start #13 in a
new chat. No automatic merge, closure, tenant upload/deployment or #13 work. Stop here.

### #12 follow-up: shared UI organization — 2026-11-17

User-requested maintenance of the current shared UI on the existing #12 branch;
this is not the start of #13. Split rendering, request orchestration and sizeable
style sets by responsibility. The public package entry remains ExplorerShell and
ExplorerShellProps; host callers, manifests, dependencies and contracts are unchanged.

- `packages/ui/src/explorer/`: shell with shared state/focus, Home, controlled
  toolbar and useExplorerCatalog. Resource/family requests remain in the shell's
  lifecycle even when Home unmounts. Category navigation and search keep existing
  criteria and separate ordinary/search expansion state.
- `packages/ui/src/permissions/`: grid, drawer, their styles, a genuinely shared
  DefinitionLabel and usePermissionDetails. Small private detail/clipboard helpers
  stay in the drawer file. The original stable query key, cancellation, Retry and
  stale-response isolation are retained.
- `src/components/RequestError.tsx` and `src/hooks/useCatalogRequest.ts` hold the
  two cross-feature building blocks. HTTP transport remains outside UI behind
  CatalogClient; no redundant service/store/Context layer was introduced.
- [Local UI rules](../packages/ui/AGENTS.md) record the durable convention and
  official React sources; [UI development](ui-development.md#source-organization)
  provides the source map. Feature folders, colocated styles and no arbitrary line
  threshold are project decisions, not an official React folder-template mandate.

Verification with Node 22.16.0 / npm 10.9.2, from repository root:

| Command/check | Result |
| --- | --- |
| npm run verify:data | Passed unchanged source digest and 788/876/60 collections. |
| npm run typecheck | Passed all shared packages, hosts, API and type fixtures. |
| npm test | 26 passed, 0 failed; real-source HTTP/SQLite/CLI and core tests unchanged. |
| npm run build | Passed shared/API/Vite and existing API SPFx production build/package. |
| npm run check:react | Passed React 18.3.1 and recursive shared dependency/host boundaries. |
| CATALOG_TEST_API_PORT=3226 CATALOG_TEST_WEB_PORT=5326 npm run test:browser | 26/26 Chromium passed, 0 failed (30.0s), after the sandbox launch retry. |
| Source review | 16 Chinese file headers; 32/32 named function/interface/type/style declarations have Chinese TSDoc. Manually checked purpose, key rules, Graph terms and English product/official wording. |
| Extraction comparison | Temporary AST comparison confirmed original style property values and normalized JSX English text multiset unchanged. Diff whitespace check passed. |

The existing dependency installation was reused because dependencies/lockfile did
not change. An ephemeral pinned Prettier 3.6.2 invocation formatted only UI source;
no formatter dependency or repository-wide configuration was added. Its first
attempt could not write the sandboxed default npm cache; a temporary cache worked.
The first Chromium run was blocked before page execution by macOS sandbox MachPort
permissions; the same full suite was rerun with permission to start Chromium.
Build retains the existing Vite chunk-size warning and no SPFx Web Part Jest suites.
Tests use their own API/Vite ports and migrated/imported in-memory SQLite, leaving
the reviewer's database and services alone. No standalone migration/import or API
provider changes required a separate persistent-database run for this UI refactor.

Manual review for this follow-up: read the local rules and source map, then use the
existing [#12 checklist](verification/spfx-json-1-human-review.md). Review Home ->
Graph -> category -> details, shared criteria on return, temporary search expansion,
keyboard/Close focus, Clipboard failure, Retry, narrow containers, sidebar scrolling
and reduced motion; expect prior behavior with the new file boundaries. Record
pass/change-needed/blocked and sanitized reproduction details. The original stage
issue checklist remains linked above; this user-requested follow-up is recorded
locally and does not publish another stage-completion announcement.

Actual SharePoint runtime remains unverified. No new SPFx/JSON product, tenant
access, upload, deployment, merge, issue closure or next-stage work occurred.
Changes are left in the current working tree for review; no commit/push was requested.
The effective main model cannot be independently switched/verified with current
tools; global settings were not changed. This small, cohesive refactor was handled
directly to avoid parallel edits and redundant coordination.

### #12 follow-up: component-local folders and Fluent UI — 2026-11-18

The user requested a deeper shared-UI refactor and an audit of native presentation
and interaction elements. This continues the local maintenance above on the current
stage branch; no #13 functionality, host identity or transport behavior was added.

#### Final organization and behavior

Each substantial component now has its own directory with an entry/style pair and
internal `components/` and/or `hooks/` as needed. There are no empty placeholder
folders or per-directory barrel files. The package still exposes only ExplorerShell
and ExplorerShellProps; existing web/SPFx callers and manifests are unchanged.

- `src/explorer/ExplorerShell/`: 123-line composition entry; ResourceNavigation,
  CatalogContent, CategoryCards and FamilyPermissions render focused UI sections.
  useExplorerController coordinates navigation/shared conditions/focus;
  useExplorerCatalog orchestrates requests; useFamilyBrowse preserves ordinary vs
  search expansion; useExplorerLayout observes actual container width. These Hooks
  are called by the shell, so child unmounts do not destroy their state.
- `src/explorer/HomePage/`: composition entry plus statistics, resource actions,
  glossary and source details. The shared toolbar is under explorer/components.
- `src/permissions/DetailsPanel/`: drawer composition, DefinitionDetails/CopyValue
  children, usePermissionDetails/useCopyValue Hooks. `PermissionGrid/` contains its
  field renderer and styles. Shared DefinitionLabel lives in permissions/components.
- `src/components/MetadataTable.tsx`: shared readonly field/value presentation,
  alongside RequestError. The generic request Hook stays in src/hooks.

The [local rules](../packages/ui/AGENTS.md) and
[source map](ui-development.md#source-organization) reflect this final structure,
including the user's component-local folder preference and lifecycle ownership.

#### Fluent UI audit and sources

The Microsoft code-reference skill was applied. The requested
[Nav Storybook](https://storybooks.fluentui.dev/react/?path=/docs/components-nav--docs)
is a client-rendered page with no readable static content in the web tool, so the
[official Nav guidance](https://fluent2.microsoft.design/components/web/react/core/nav/usage),
[official Nav contract source](https://github.com/microsoft/fluentui/blob/master/packages/react-components/react-nav/library/src/components/Nav/Nav.types.ts)
and installed `@fluentui/react-components` 9.75.2 / `@fluentui/react-nav` 9.4.10 types
and implementation were checked. Microsoft Learn search primarily returned other
Fluent product families, so those APIs were not applied to React v9. The Nav usage
page labels the component Preview; this change uses the already pinned package
rather than upgrading dependencies or making a production-runtime claim.

| Previous presentation | Current component and preserved behavior |
| --- | --- |
| Native nav with manually styled action buttons | Controlled Fluent Nav/NavItem, selectedValue, native disabled items and aria-current; same Home/Graph navigation, keyboard activation and Coming soon items. |
| Home and detail dl/dt/dd | Shared Fluent Table/TableBody/TableRow/TableHeaderCell/TableCell and Text; accessible rowheader + scope=row, all field names/official values and Clipboard controls preserved. |
| Native source details/summary | Fluent Accordion with default collapsed state, keyboard activation and aria-expanded. |
| Bare p/span/strong/h1 presentation | Fluent Body1/Text/heading presets with supported semantic as values; focusable catalog heading uses ref-capable Text as h1. |
| Statistics div and definition section surfaces | Fluent Card, with existing layout and unique definition region labels. |
| Native layout wrappers and Select options | Retained main landmark, Grid/scroll/spacing divs and Select's required option children; these provide semantics/layout rather than competing styled controls. |

All TSX components were inspected. No native nav/dl/dt/dd/details/summary/p/span/
strong/heading/section presentation remains. Existing Fluent Button/Field/Input/
Select/Checkbox/DataGrid/Drawer/Badge/Spinner/MessageBar controls continue to use
Fluent UI. There is no Fluent definition-list export in the installed suite;
Text's supported as union excludes dt/dd, so no unsupported type assertion was used.

Additional official references: [Text](https://fluent2.microsoft.design/components/web/react/core/text/usage),
[Accordion](https://fluent2.microsoft.design/components/web/react/core/accordion/usage),
[Card](https://fluent2.microsoft.design/components/web/react/core/card/usage),
and [Table example](https://github.com/microsoft/fluentui/blob/master/packages/react-components/react-table/stories/src/Table/Default.stories.tsx).
Directory decisions and the shared metadata table are project choices based on
these component contracts, not prescribed universal Fluent/React folder templates.

#### Verification and handoff

Node 22.16.0 / npm 10.9.2; all commands run from root. Dependencies and lockfile did
not change, so the existing installation was reused; no registry upgrades or new
runtime packages. No persistent local database was migrated/imported for this UI
change; real-source Node/browser integration tests create their own isolated data.

| Command/check | Result |
| --- | --- |
| npm run verify:data | Passed unchanged source digest and 788/876/60 collections. |
| npm run typecheck | Passed all packages/hosts/type fixtures after final integration. |
| npm test | 26 passed, 0 failed. |
| npm run build | Passed shared/API/Vite plus existing API SPFx production lint/build/package. |
| npm run check:react | Passed React 18.3.1, SPFx externals and recursive dependency boundaries. |
| CATALOG_TEST_API_PORT=3227 CATALOG_TEST_WEB_PORT=5327 npm run test:browser | 28 passed, 0 failed (30.0s). Known MachPort sandbox restriction was handled by using the permitted Chromium execution environment directly. |
| Comment and source audit | 38 source headers and 66/66 named declarations/style Hooks have Chinese TSDoc; purpose/rules/Graph terms checked manually. All native JSX elements reviewed by actual role. |
| Visual review | Inspected browser-produced Home and 320px detail PNGs; Nav selection/Card surfaces/field table render correctly and the long real permission detail remains within the viewport. Browser checks also cover 320/360px and embedded-host widths. |
| Review and hygiene | Bounded independent read-only review found no concrete controller/expansion/lifecycle/focus/metadata-HTML regression. git diff --check and local doc links pass. |

Two bounded subagents used explicit GPT-6.1 Sol/medium settings for disjoint Home
and permission files; main owned shell, shared MetadataTable, imports, tests, docs
and integration. The permission agent also reviewed the shell read-only. No shared
file writes, branch switching or global settings changes. Main effective model
cannot be independently switched/verified through current tools. Early package-only
typechecks during moves exposed temporary unresolved imports; final integrated
checks passed. A heading preset lacked a forwarded ref in installed types, so the
focusable h1 uses the supported Text component instead. No unsafe type cast was added.

The existing Vite chunk-size warning and absence of SPFx-specific Jest suites
remain. Actual SharePoint, screen-reader testing, other browser engines and hosted
CI are unverified. Production packaging does not establish SharePoint acceptance.

[Follow-up human-review steps](verification/spfx-json-1-human-review.md#ui-maintenance-follow-up--2026-11-18)
include the new structure, Nav selection/disabled states, source Accordion and
metadata row headers. The original stage issue checklist remains linked above;
this local maintenance does not publish another stage-completion announcement.
Changes remain in the working tree for user review. No commit/push, merge, issue
closure, tenant access/upload/deployment or next-stage work was performed.

### UI instruction cleanup — 2026-11-18

At the user's request, shortened packages/ui/AGENTS.md to durable UI-specific rules,
following OpenAI's [Codex best practices](https://learn.chatgpt.com/guides/best-practices).
Removed repeated root policy and moved official references/implementation examples
to [UI development](ui-development.md#design-references). Component folders, shared
state lifetime, neutral client, Fluent preference, style boundaries and verification
remain covered. Documentation only: local link checks and git diff --check passed;
no runtime tests were rerun. Earlier UI implementation/test results remain unchanged.

The user subsequently requested English for packages/ui/AGENTS.md. Translated the
same eight rules without changing their scope; link and whitespace checks passed.

### Shared UI follow-up publication — 2026-11-18

The user authorized committing/pushing this conversation's changes and updating the
existing [PR #16](https://github.com/VigilanteWang/graphpermlist/pull/16) and related
handoff documents. This publication supersedes the earlier working-tree-only stop
notes. It includes component-local source organization, controlled Fluent Nav,
shared field Tables, source Accordion, Card/typography, two additional browser
cases and the concise English UI AGENTS.md. Existing document and PR languages
are preserved; program comments remain Chinese under the repository rules.

Remote PR metadata and git fetch confirmed the same open, non-draft stage PR and
unchanged main/predecessor; the local stage branch matched its remote before
submission. Final Node/browser/build logs were checked against source/test file
modification times: no subsequent source/test edits. The only edits after the
full typecheck were unused style imports, already covered by the later complete
build. No unnecessary runtime rerun was added for subsequent documentation edits.
Pre-submit whitespace, source-comment, native-element and local-link checks pass.
The complete verification table and remaining SharePoint/runtime limits above
continue to apply. Publication identifiers and the issue review link follow below.
