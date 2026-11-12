# Implementation plan

Parent: [#2](https://github.com/VigilanteWang/graphpermlist/issues/2).
The latest issue body is authoritative. This plan records implementation evidence.

## Stages and workflow

1. [#3 Foundation](https://github.com/VigilanteWang/graphpermlist/issues/3): implementation and local validation complete on `codex/phase-1-foundation`; awaiting independent PR review.
2. [#4 Data and API](https://github.com/VigilanteWang/graphpermlist/issues/4): not started; requires stage 1 merged into main and verified.
3. [#5 Shared UI](https://github.com/VigilanteWang/graphpermlist/issues/5): not started.
4. [#6 Review and delivery](https://github.com/VigilanteWang/graphpermlist/issues/6): not started.

Option A: independent stage PRs against updated main. Stage 1 has no predecessor.
Initial checkout had only LICENSE at `475693b`; no existing plan/AGENTS or PR.
The untracked source export is preserved and ignored; sanitized input is versioned under data/.
Do not merge, close issues, deploy or automatically begin stage 2.

## Environment and agents

Node 22.16.0 / npm 10.9.2 are pinned to the actual supported local environment.
Host: macOS arm64, Xcode command line tools available for native fallback builds.
Only project AGENTS.md is configured; no global settings, credentials or additional skills installed.
The main agent owns dependency/contract/build/Git integration. A bounded subagent
was successfully launched with GPT-6.1 Sol / medium for data inspection and sanitization.
The main agent's effective model cannot be independently changed/verified through this task's tools.
No model preference is persisted in project instructions.

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
Four routes are contracted. Stage 1 serves an honest unimported empty resource list;
per-resource routes return 404 until a resource is imported in stage 2. No fixture catalog
is served as real data. The test-only fixtures demonstrate merged rows and type-specific fields.
Migrations, entities, transactional import and business queries are stage 2 work.

## Validation evidence

Verified on 2026-11-13 (Asia/Shanghai). See [evidence](verification/phase-1.md) and
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

## Handoff

Implementation commit: [`dc8346f`](https://github.com/VigilanteWang/graphpermlist/commit/dc8346f1f634366fbb179a575fc04bd05cdf7eea).
Stage PR: [#7](https://github.com/VigilanteWang/graphpermlist/pull/7), base main,
head codex/phase-1-foundation. Code and local checks are ready for review; the PR is
transitioned out of Draft after the final handoff push is verified. No merge is authorized.
This follow-up commit records publication and handoff only; validation evidence above
covers the implementation commit. Consult the live PR for its current review state. SharePoint tenant runtime, stylesheet isolation
in a real page and narrow-container acceptance are explicitly not verified in this stage.
No SharePoint test deployment has been authorized.

After user review/merge, verify the merged main with the documented stage 1 commands.
Then start #4 from updated main in a new stage branch. Implement versioned migrations,
entities, offline import via Nest application context and the four real read-only queries
using these contracts; preserve transactional replacement and classification versioning.
Do not enable fixture serving or schema synchronization. #4 has not been started here.
