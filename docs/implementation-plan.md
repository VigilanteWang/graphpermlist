# Implementation plan

Parent: [#2](https://github.com/VigilanteWang/graphpermlist/issues/2).
The latest issue body is authoritative. This plan records implementation evidence.

## Stages and workflow

1. [#3 Foundation](https://github.com/VigilanteWang/graphpermlist/issues/3): merged via [PR #7](https://github.com/VigilanteWang/graphpermlist/pull/7) into main at `81682a9`; code and baseline reverified before #4.
2. [#4 Data and API](https://github.com/VigilanteWang/graphpermlist/issues/4): implemented and locally verified on `codex/phase-2-catalog-api`; publication recorded in the handoff below.
3. [#5 Shared UI](https://github.com/VigilanteWang/graphpermlist/issues/5): not started.
4. [#6 Review and delivery](https://github.com/VigilanteWang/graphpermlist/issues/6): not started.

Option A: independent stage PRs against updated main. Stage 1 has no predecessor.
Initial checkout had only LICENSE at `475693b`; no existing plan/AGENTS or PR.
The untracked source export is preserved and ignored; sanitized input is versioned under data/.
Do not merge, close issues, deploy or automatically begin #5.

## Human review at every stage completion

At the end of each stage, publish an actionable human-review checklist as a comment
on that stage's GitHub issue and retain it (or a durable link) in the implementation
plan. This is a required handoff deliverable for subsequent stages #5 and #6 as well.
Do this before stopping; automated test success does not replace human acceptance.

Each checklist must state what to read, exact setup/commands or UI actions, expected
observable results, configuration and data prerequisites, unresolved decisions and
unverified scope. Distinguish isolated test data from the reviewer's local database,
and build success from actual host runtime. Link the PR, evidence and relevant files;
ask reviewers to record pass/change-needed/blocked with reproducible, sanitized evidence.
Do not infer permission to merge, deploy, close issues or start the next stage.

- #4: [manual review checklist](verification/phase-2-human-review.md); publish to issue #4.
- #5: include both hosts' same-data behavior, search/category/count/detail/disabled
  states, keyboard/focus/reduced motion, narrow containers and style isolation. State
  whether actual SharePoint testing is available/authorized; otherwise record the gap.
- #6: include parent #2 acceptance mapping, independent findings and resolutions,
  reproducible end-to-end regression, remaining runtime gaps and the user's release decision.

## Environment and agents

Node 22.16.0 / npm 10.9.2 are pinned to the actual supported local environment.
Host: macOS arm64, Xcode command line tools available for native fallback builds.
Only project AGENTS.md is configured; no global settings, credentials or additional skills installed.
The main agent owns dependency/contract/build/Git integration. A bounded subagent
was successfully launched in stage 1 with GPT-6.1 Sol / medium for data inspection and sanitization.
The main agent's effective model cannot be independently changed/verified through this task's tools.
At the user's request, AGENTS.md now records GPT-6.1 Sol/high for the main conversation
and Sol/low or medium for execution subagents, where supported. Stage 2 used an explicit
GPT-6.1 Sol/medium spawn for bounded classification and a read-only review; no global settings changed.
Code, docs and retained logs must exclude personal data, tenant identifiers and personal paths.

## Compatibility decisions

- [SPFx compatibility](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/compatibility):
  1.24.1 supports Node 22 (>=22.14), 24, 26; exact React 18.3.1; TS <=5.8.
  Keep supported Node 22.16.0 and TypeScript 5.8.3; do not upgrade the global runtime.
- SPFx uses the 1.24.1 official generator's Heft rig/config pattern, separate from Vite.
  Template dependencies were inspected from `@microsoft/generator-sharepoint@1.24.1`.
- [Fluent UI package](https://github.com/microsoft/fluentui/blob/master/packages/react-components/react-components/package.json):
  v9.75.2 published peers accept React >=16.14 <20. Shared UI owns no React runtime.
- [Nest 11](https://docs.nestjs.com/v11/migration-guide): Node >=20, default Express 5;
  pin 11.1.29 and @nestjs/typeorm 11.0.0 rather than taking a new major implicitly.
- [TypeORM SQLite](https://typeorm.io/docs/drivers/sqlite/): pin TypeORM 0.3.31 and
  better-sqlite3 12.11.1 (published driver peer includes 12.x; Node 22 supported).
  Database options isolated in DatabaseModule; synchronize and migrationsRun disabled.
- [Vite](https://vite.dev/guide/): 7.3.8 requires Node >=22.12 on the 22 line.
- Direct dependencies are exact, transitive versions captured in the root npm lockfile.
- [OpenAI project guidance](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
  informs the concise repository-local instructions; no product configuration is required.

## Contracts and scope

See docs/api-contract.md and packages/contracts/src/index.ts. resourceId is Resource App ID.
Nest ConfigModule owns API port, allowed origins and SQLite path. Browser API URL is a
Vite build variable or SPFx Web Part property; the UI/client have no host identity dependency.
Four routes now query the active imported snapshot using injected TypeORM repositories.
A migrated, unimported database returns an honest empty resource list; unknown resources
return 404. CLI uses a Nest application context with the same modules and configuration,
explicit versioned migration, and transactional import. No fixture catalog is served.

Definition identity is resource/version + type + GUID, with merged rows by value. Even
distinct GUIDs of one type sharing a value survive. Matching definitions determine row
fields/labels/counts; details separately retain all definitions. Same-definition filters,
source fields, admin-consent mapping and default disabled exclusion match the shared contract.
Provider DDL remains in database/; no HTTP objects enter business query/import services.
See [operations](catalog-operations.md) and [classification](classification.md).

## Stage 1 evidence and merged-main baseline

Originally verified on 2026-11-13 (Asia/Shanghai). See [evidence](verification/phase-1.md) and
sanitized command transcripts in docs/verification/.

- Clean source-only directory: npm ci succeeded (1424 packages), verify:data passed,
  typecheck passed, build passed, check:react passed, npm test passed 6/6.
- Actual Chromium + local Nest/Vite: npm run test:browser passed 2/2, including
  360px width, no page exceptions, failed API response and successful retry.
- Actual SQLite driver query and Nest dependency resolution/connection shutdown pass.
  Four route status/validation behavior, false boolean parsing, CORS and default
  500 exception redaction are covered. No Repository/entity is claimed before #4.
- SPFx Heft production build/lint and package-solution succeed; .sppkg generated.
  The Heft rig has no Web Part-specific Jest tests yet (reports 0); this is not
  evidence of SharePoint runtime acceptance. Root integration tests are separate.
- The official Heft version selector assumes project-local node_modules and fails
  under npm hoisting. Use its documented --unmanaged option with the workspace's
  pinned Heft binary. SPFx tsconfig overrides root/output/type lookup paths for hoisting.
- Published SPFx loader/property-pane/webpart-base dependencies still install
  isolated React 17.0.1. Host/UI imports resolve identically to 18.3.1; compiled
  SPFx manifest externalizes React and react-dom/client at 18.3.1 plus the Microsoft
  host packages. No broad override of those internal packages was introduced.
- Independent Sol/medium review found two issues (unvalidated resource-list queries
  and malformed JSON error handling). Both fixed, regression tests added, and
  source fixes re-reviewed with no remaining blockers.
- Original input SHA256 remains unchanged; all three safe permission arrays deeply
  equal their original collections (788/876/60; four disabled ordinary definitions).

Installation emits upstream deprecation notices from SPFx/tooling/native dependencies;
these do not fail the verified builds. No broad dependency upgrades were made outside
the compatible pinned baseline. Other OS/architectures and hosted CI are unverified.

## Stage 2 implementation and verification

Prerequisite: live PR #7 was confirmed merged and `git fetch origin` verified main
`81682a92b6280d425b06e05c9d1c303e3e8c8d63`. Created this phase's new branch from that
main; did not reuse the phase 1 branch. Before implementation, reran `npm ci`,
`npm run verify:data`, `npm run typecheck`, `npm test` (6/6), `npm run build` and
`npm run test:browser` (2/2). All passed. Chromium initially failed under the sandbox's
macOS process restrictions; the permitted browser rerun passed. Retained baseline
transcripts are under docs/verification/phase-2/.

Delivered resource/import/category/family/definition entities, a versioned SQLite
migration, offline import and four real read-only APIs. Import retains safe raw fields,
excludes RSC and user/group-only app roles, publishes atomically, retains history,
and reuses the active identical source/classification. Classification hashes include
rules' resulting assignments and category metadata; changes require reimport.
A shared CJS source loader serves both prebuild verification and the Nest importer.

Final checks on 2026-11-13/14 (Asia/Shanghai):

- `npm run verify:data`: pinned digest and 788/876/60 collections; four disabled ordinary definitions.
- `npm run db:migrate`, `npm run import:data` twice against an isolated file database:
  migration applied, 1,664 definitions, repeated import reused the version.
- `npm test`: 14 tests pass, 0 fail. Includes isolated SQLite/Nest HTTP integration,
  all official fields/raw definitions, 1,036 merged names, 1,660 default definitions,
  same-definition filters and independent expected-result comparisons, category totals,
  GUID search/full details, disabled states, false/invalid/repeated parameters,
  unknown/empty/error states, actual partial-write and publication-failure rollback,
  updated snapshots, same-type duplicate-value preservation and concurrent-call serialization.
- CLI tests spawn independent processes for migration/import/duplicate import/failures,
  then a new HTTP context reads the same persisted database. Success and failure exit,
  including initialization failure, are bounded and path output is redacted.
- `npm run typecheck`, `npm run build`, `npm run check:react`: all pass; Vite and SPFx
  production packages remain buildable, same React/host boundaries as stage 1.
- `npm run test:browser`: 2/2 pass with real migrated, unimported Nest and Vite;
  the browser fixture only initializes test :memory: schema, never serves fixture data.
- `git diff --check` and source/document/retained-log personal-path checks pass.
- Independent Sol/medium review found one CLI initialization-path disclosure; fixed
  with non-aborting, quiet Nest context initialization and a fixed CLI error. Reviewer
  rechecked the reproducer and transactional/CLI test design with no remaining blockers.

Complete evidence and test mapping: [stage 2 verification](verification/phase-2.md).
The 189 definitions / 113 values conservatively classified Uncategorized are preserved,
not omitted. Classification is editorial navigation, not an authorization boundary.
Cross-process writer contention can fail and be retried; no history pruning/rollback CLI
or SQL Server provider acceptance is claimed. No new dependencies or lockfile changes.

## Stage 2 handoff

Implementation commit: [`e8224f8`](https://github.com/VigilanteWang/graphpermlist/commit/e8224f88483b262c064b388c1c0828cea2f35c8c).
Stage PR: [#8](https://github.com/VigilanteWang/graphpermlist/pull/8), base main,
head codex/phase-2-catalog-api. Created as Draft; after this documentation-only handoff
is pushed and verified, it is marked Ready for review. Consult the live PR for current state.
The verification evidence covers the implementation commit; this follow-up changes only
handoff documentation, so no runtime checks are repeated.

The stage 2 code and local checks are complete. Review and merge this independent PR
into main, then start #5 in a new chat/branch from updated main after verifying the merge.
#5 owns full shared UI and Vite/SPFx browser acceptance. Preserve the matching-subset
versus allDefinitions contract, same-filter category totals, source state and disabled labels.

No merge, issue closure, SharePoint test deployment, Azure or production deployment
was performed. SPFx only built/packaged; actual SharePoint page runtime, style isolation
and narrow Web Part acceptance still require the authorized test tenant in later stages.
No hosted CI, other OS/architectures or live Graph/tenant enforcement was verified.
Stop here; do not start #5 automatically.

Human-review follow-up: added the #4 reviewer checklist and the recurring stage handoff
requirement. Documentation/instructions only; checked commands and expected results
against the current API contract and verification record, plus `git diff --check`.
No application tests repeated and no local database was migrated/imported by this update.

## Stage 2 review follow-up: explicit family arrays

Review baseline: `08e0b33`, PR #8 remains open; changes stay on the same stage branch.
Replaced each FAMILY_GROUPS whitespace-delimited string with a readonly string array
and removed trim/split from FAMILY_CATEGORIES construction. Each family is now an
explicit quoted entry. No dependency, contract or classification-assignment change.

Validation under Node 22.16.0 / npm 10.9.2:

- An isolated Node/TypeScript in-memory comparison of the before/after modules
  deep-compared all 341 family mappings (15 groups), 8 exact overrides, category
  metadata, the version, all 1,664 ordinary source definitions and OIDC/unknown/
  case-sensitive/prototype-like probes. All matched.
- Recomputed the importer's classification hash for the real source in both modules:
  `e2d88c4fa606f54a84619f75bb29644cd55dbde73e58bcbecbf7a4ace4378016` in both cases.
  The representation-only change keeps classification version `2026-11-13.1`.
- `npm run typecheck`: passed across all workspaces.
- `npm test`: 14 passed, 0 failed; pretest rebuilt shared packages and the API.
- `git diff --check`: passed. Full frontend bundles/browser acceptance were not
  repeated for this isolated representation change; previous stage evidence remains
  above. No migration/import was run against the local working database.

Human review follow-up for issue #4: inspect FAMILY_GROUPS entries as category plus
family arrays, confirm FAMILY_CATEGORIES directly maps entries without whitespace
parsing, and check mapping/output/hash equivalence above. Existing stage checklist
still applies; this follow-up does not add deployment or next-stage authorization.
