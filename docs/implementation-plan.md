# Implementation plan

Parent: [#2](https://github.com/VigilanteWang/graphpermlist/issues/2).
The latest issue body is authoritative. This plan records implementation evidence.

## Stages and workflow

1. [#3 Foundation](https://github.com/VigilanteWang/graphpermlist/issues/3): merged via [PR #7](https://github.com/VigilanteWang/graphpermlist/pull/7) into main at `81682a9`; code and baseline reverified before #4.
2. [#4 Data and API](https://github.com/VigilanteWang/graphpermlist/issues/4): merged via PR #8 at `b13d5c9`; #3/#4 closed on explicit user authorization when starting #5.
3. [#5 Shared UI](https://github.com/VigilanteWang/graphpermlist/issues/5): merged via [PR #9](https://github.com/VigilanteWang/graphpermlist/pull/9) at `53d85a1`; includes the shared-criteria, toolbar and Home/sidebar follow-ups. SharePoint runtime remains pending.
4. [#6 Review and delivery](https://github.com/VigilanteWang/graphpermlist/issues/6): independent review and clean regression performed; final handoff below and [acceptance mapping](verification/phase-4.md). Actual SharePoint and cross-host runtime comparison remain unverified.

Option A: independent stage PRs against updated main. Stage 1 has no predecessor.
Initial checkout had only LICENSE at `475693b`; no existing plan/AGENTS or PR.
The untracked source export is preserved and ignored; sanitized input is versioned under data/.
Do not merge, close current/parent issues, deploy or start further work without authorization.
Earlier sections below are chronological records; their historical unmerged/uncommitted
states are superseded by the stage summary and latest handoff.

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

## 中文源码注释要求更新（2026-11-16）

本次为阶段 2 的注释维护，沿用当前阶段分支，不启动 #5。已为 22 个手写
程序源码文件补充面向初学者的中文 TSDoc/JSDoc，涵盖 API 模块、实体、迁移、
导入/查询服务、契约、client、UI、两个宿主入口及工具脚本。每个文件说明用途，
类、接口、函数和方法说明职责，关键逻辑说明规则或边界。Graph 领域词
resource、Application、Delegated、permission、scope、appRole、admin consent、
RSC、family 等保留英文。配置（含环境配置源码）、测试/夹具、编译产物和
HTML 等静态文件未修改。产品文本、契约和运行逻辑保持原样。

已将新要求写入 AGENTS.md，并直接替换后续 issue
[#5](https://github.com/VigilanteWang/graphpermlist/issues/5) 与
[#6](https://github.com/VigilanteWang/graphpermlist/issues/6) 的原有“中文源码注释要求”
段落，保留原有阶段范围和新对话入口；写入后重新读取，两份正文均与预期一致。

验证环境为 Node 22.16.0 / npm 10.9.2：

- 使用 TypeScript parser 与 removeComments printer 对比 HEAD 和工作区，
  22 个源码文件去注释后的输出完全相同；77 处类、接口、函数及方法声明均有中文
  TSDoc/JSDoc，并人工复核具名箭头函数及关键逻辑说明。
- `node --check scripts/permissions-source.cjs`、
  `node --check scripts/verify-data.mjs`、
  `node --check scripts/check-boundaries.mjs` 通过。
- `npm run typecheck`：全部 workspace 和测试类型检查通过。
- `npm test`：14 项通过，0 失败（含 pretest 的共享包与 API 编译）。
- `git diff --check` 通过。没有新增依赖，未改 manifests 或 lockfile。

本次仅修改源码注释与维护文档，因此未重复安装依赖、执行本地数据库迁移/导入、
完整双宿主打包或浏览器验收；不增加任何 SharePoint 运行验收结论。
交接检查：对照 AGENTS.md 检查声明用途、关键逻辑和英文术语保留，确认排除文件
未被修改；可运行上述命令复核。变更保留在当前工作区供审阅，本次未提交或推送，
未合并、关闭 issue、部署或启动下一阶段。

后续注释反馈（2026-11-16）：调整 `packages/contracts/src/index.ts` 的全部
18 个接口和类型说明，先描述其代表的数据、结构或取值，再按需说明用途和规则。
保留 Graph 英文术语。使用 TypeScript parser 和 removeComments printer 与本次
修改前内容对比，去注释后的代码完全一致；18 个声明均有中文 TSDoc，
`git diff --check` 通过。此次仅调整注释措辞，未重复运行应用测试；变更仍待审阅，
未提交或推送。

全量注释复核（2026-11-16）：检查本次对话修改的全部 22 个源码文件，将
90 处文件、类、接口、函数及方法说明调整为先讲“是什么”，再按需补充职责、
规则或边界。contracts 中已有的数据结构说明予以保留；关键逻辑行注释继续解释
规则和原因，不强制改成名词说明。AGENTS.md 及后续 #5、#6 的旧规则已同步替换，
两个 issue 写入后回读一致。

验证：以本轮修改前快照和 Git HEAD 分别为基准，使用 TypeScript parser 与
removeComments printer 对比，22 个文件的去注释输出均完全一致且无解析错误；
80 处类、接口、类型、函数和方法声明均具备中文 TSDoc/JSDoc（包含 3 个类型别名），
并人工复核声明语义及具名箭头函数。`git diff --check` 通过。仅注释和文档措辞
变化，未重复应用测试、构建或数据库操作；无新增运行验收结论，仍未提交或推送。

导入设计说明与后续优化记录（2026-11-16）：核对 `catalog-cli.ts`，当前 CLI
一次调用只导入一个配置文件、调用一次 `importFile()`；服务内队列用于同实例
重叠调用时避免事务冲突，不是多文件批处理，也不协调独立 CLI 进程。现有测试
`tests/catalog.test.mjs` 包含同实例两个并发调用。此次只读核对，未修改导入逻辑。
按用户要求在 [issue #4 评论](https://github.com/VigilanteWang/graphpermlist/issues/4#issuecomment-6912792842)
记录正式版本需优化整版快照造成的重复保存及历史数据增长，评估定义复用、增量
存储和历史保留/清理策略，保持事务发布、失败回滚及来源追溯。本次仅记录后续
需求，不提前实施；文档执行 `git diff --check`，无需重复运行应用测试。

模块配置维护（2026-11-16）：已按宿主明确 NodeNext / Bundler 规则，API 保持
CommonJS，共享包保持 ESM，SPFx 保留官方 rig。安装、数据校验、类型检查、
14 项测试、完整构建/打包、React 边界及 2 项浏览器测试均通过；隔离数据库的
迁移、两次导入和 HTTP 启动通过。最终基线见 [README](../README.md#typescript-与浏览器兼容基线)，
命令、限制和后续 #5/#6 验收见[验证补充](verification/phase-2.md#typescript-configuration-follow-up--2026-11-16)。
后续基线和待验项已同步到 [#5](https://github.com/VigilanteWang/graphpermlist/issues/5)
及 [#6](https://github.com/VigilanteWang/graphpermlist/issues/6)，写入后回读一致。
已移除本次调查记录，仅保留实施交接；后续发布授权与操作见下文，未启动后续阶段。

提交与 PR 更新（2026-11-16）：用户授权提交当前改动并写入现有 PR。确认中文
源码注释已包含于 `400b493`，远端 PR #8 已包含该提交；当前 12 个待提交文件为
模块配置及对应文档。沿用 `codex/phase-2-catalog-api`，提交说明为
`build: align TypeScript module settings with each host`，推送至同名 origin 分支，
在 [PR #8](https://github.com/VigilanteWang/graphpermlist/pull/8) 正文和评论记录更新。
发布前再次运行 `npm run typecheck`、`npm test`（14 通过，0 失败）和
`git diff --check`，均通过；完整构建、
浏览器、安装及隔离数据库验证沿用上方本次配置维护的验证记录，不重复声明新结果。
保留正式版本优化重复快照存储的后续需求。未经授权不合并、关闭 issue 或部署。


## Stage 3 implementation and handoff — 2026-11-17

Started after live GitHub confirmed #7/#8 merged and fetch confirmed clean
main/origin/main `b13d5c94887061f57e14c165fbc37cff45a57663`. Reused the only clean
checkout and created new `codex/phase-3-permissions-ui`; no old branch or user edits
were reused. Read current #2/#5, AGENTS.md and this plan before implementation.
At the user's explicit request, closed completed #3/#4 and checked their stage entries
in #2; #5/#2 remain open. This does not certify deferred SharePoint runtime acceptance.

Delivered the complete English shared Fluent UI catalog, real API search/filters/counts,
family DataGrid and all-definition modal details, Clipboard fallback, navigation/search
state restoration, cancellation/obsolete-response isolation, container layout and reduced
motion. Both adapters use the same component/client; SPFx has cached client, one root,
disposal and light/dark theme integration. Added the local HTTPS API proxy/guide.
No permissions data, API contract, classification or production database was changed.

Actual final checks: clean `npm ci` using a disposable cache, `npm run verify:data`,
`npm run typecheck`, `npm test` (14 pass), `npm run build` (Vite/SPFx package included),
`npm run check:react`, `npm run test:browser` (18 Chromium pass), HTTPS utility syntax,
`git diff --check`. Disposable-file CLI migration/import/reimport and real HTTP through
TLS proxy passed certificate verification, GET/CORS, OPTIONS and rejected-write checks.
Full commands, sanitized logs, screenshots, independent review corrections and limits:
[stage 3 verification](verification/phase-3.md).

Chinese source-comment acceptance: 6 source files, 28/28 named declarations with Chinese
TSDoc/JSDoc plus module headers; manually checked scope, “what it is” first, key rules,
English domain terminology and accuracy. Configuration/tests/fixtures/generated/static
files excluded by purpose. Product/API/official text remains English.

SPFx production build/package succeeds; **SharePoint page runtime remains unverified**.
No tenant/test deployment authority was available. Actual same-data host comparisons,
SharePoint package load/lifecycle/theme contrast/style isolation/narrow columns require
the authorized test environment. Other browser versions/platforms and hosted CI are
unverified. The Vite >500 kB advisory and upstream tooling deprecations are non-fatal.
No Azure, tenant or production deployment and no merge were performed.

Implementation commit: [`f6c8074`](https://github.com/VigilanteWang/graphpermlist/commit/f6c807494fa88e940eefaa6ba62df47054fe9db8).
Independent [PR #9](https://github.com/VigilanteWang/graphpermlist/pull/9), base main,
head `codex/phase-3-permissions-ui`. Created Draft; this documentation-only handoff is
pushed before marking Ready for review. Consult the live PR for current state.
The implementation commit is covered by the final checks above; this follow-up changes
only publication records, so runtime checks are not repeated.

Human handoff: [review checklist](verification/phase-3-human-review.md) published in
[issue #5 comment](https://github.com/VigilanteWang/graphpermlist/issues/5#issuecomment-6922262201),
including exact setup/UI steps, expected results and the unresolved SharePoint scope.
The issue's local verification items are checked; actual SharePoint/same-data comparison
remains unchecked. Review this PR, request fixes on the same branch, and merge only
with user authorization.
After merge, verify main and wait for the user to start #6; do not start it automatically.


## Stage 3 review fix: shared search criteria — 2026-11-17

Continued on the existing, unmerged PR #9 branch from clean `34bce1e`; no branch switch
or user changes were involved. The latest #2/#5 and current AGENTS.md were checked.
Reproduced the user's EWS case with real imported Nest data: after an earlier Exchange
visit, re-entry restored old Mail.Read/Application/Mail criteria despite new global
Delegated/EWS criteria. The added regression failed on the old implementation.

Removed per-category query caching. Both levels now share text/type/admin consent/
family/disabled criteria; navigation only changes the category scope, and changes on
level two also remain current on return. Per-category Accordion expansion and search
clear restoration remain independent of this shared query. Updated the guide and
human checklist to supersede the earlier independent-query behavior.

Tests now support CATALOG_TEST_API_PORT / CATALOG_TEST_WEB_PORT. Used 3100/5273 to
preserve the already running API/Vite at 3000/5173, including their PIDs and databases.
A full browser regression also exposed narrow modal clipping with non-overlay scrollbar
locking; Drawer max-width now respects its containing width and both edges are checked.

Verification under Node 22.16.0/npm 10.9.2:
- `npm run typecheck`: passed after final source changes.
- `npm test`: 14/14 passed; no backend/data/client contracts changed.
- `npm run build`: shared/API/Vite/SPFx production build, lint and package passed.
- `npm run check:react`: passed; no dependency/host-boundary changes.
- `CATALOG_TEST_API_PORT=3100 CATALOG_TEST_WEB_PORT=5273 npm run test:browser`:
  19/19 passed after compilation finished, including EWS repeated visits, all criteria
  in both directions, counts/rows against real HTTP, expansion, focus and narrow modal.
  [Sanitized browser log](verification/phase-3/search-criteria-browser.log.txt).
- `git diff --check`: passed. Source-comment audit: both changed source modules retain
  Chinese headers and 18/18 named declarations with Chinese TSDoc; purpose-first text,
  state ownership, key rules and retained domain terminology manually checked.

No dependency/data changes, so no repeat install or production database migration/import.
SharePoint actual page remains unverified; no tenant deployment, merge, issue closure
or next-stage work was performed. The fix was published in PR #9 as
[`fe0a91e`](https://github.com/VigilanteWang/graphpermlist/commit/fe0a91e66f872dee3092e7512c49f4317bc58eb6);
the [updated #5 checklist](https://github.com/VigilanteWang/graphpermlist/issues/5#issuecomment-6938657482)
was posted and supersedes the original query-restoration step: visit Exchange once, return, select Delegated/EWS, enter again;
expect unchanged criteria and exactly the matching EWS result. Edit controls on level
two and return; expect the same current criteria, with only search scope broadened.

The following handoff update changes documentation only; checked `git diff --check`
and did not repeat runtime tests. PR #9 remains Ready for review and unmerged.


## Stage 3 review follow-up: search toolbar layout — 2026-11-17

Continued on PR #9's clean, unmerged branch at `e7d2e6a`. Removed the explanatory
sentence below Search permissions at both levels. The shared filter fields now have
explicit basis/grow rules (matching type/admin columns, a wider family column) rather
than native select option lengths determining their widths. The Vite document reserves
a vertical scrollbar gutter so long category lists and short service pages have the
same available width. This document-level setting belongs only to the standalone host;
shared styles remain local and do not change the SharePoint document.

Added actual browser geometry checks at 1754x1055 comparing all three select widths
between the Graph category page, Education and Exchange, plus absence of helper text.
Existing narrow-container, keyboard, filter and detail regressions remain in the suite.
Verified:
- `npm run build:shared` and `npm run typecheck -w @graph/web`: passed.
- `npm run build`: shared/API/Vite/SPFx production build, lint and package passed.
- `CATALOG_TEST_API_PORT=3100 CATALOG_TEST_WEB_PORT=5273 npm run test:browser`:
  20/20 passed, including unmodified host-width comparisons at 1754x1055,
  Education/Exchange and existing 320/360px/narrow-container behavior.
  [Browser log](verification/phase-3/toolbar-layout-browser.log.txt) and
  [updated toolbar](verification/phase-3/toolbar-education.png).
- Current in-app browser inspection at 1754x1055 measured identical primary/secondary
  widths: 284.6015625 / 284.6015625 / 455.359375 px. Helper text absent in both views.
- `git diff --check`: passed. Chinese source-comment audit: index.tsx retains its
  module header and 7/7 named declarations with Chinese TSDoc; new layout comments
  explain intrinsic-size stability. HTML/tests are excluded by purpose.

No API/data tests repeated for this presentational change. SharePoint actual page
remains unverified; packaging is not runtime acceptance. Published this review fix as
[`4c7e1ec`](https://github.com/VigilanteWang/graphpermlist/commit/4c7e1ec5a75bbda0356a0f9b02493247c9165ce4)
in PR #9. Posted the [updated #5 review steps](https://github.com/VigilanteWang/graphpermlist/issues/5#issuecomment-6939110535):
verify no helper text or select-width jump on category entry/return. This final
publication update changes documentation only; `git diff --check` passed.
No data/API/dependency changes; no install or local database migration/import needed.


## Stage 3 review follow-up: Home and fixed sidebar — 2026-11-17

Continued on the clean existing `codex/phase-3-permissions-ui` branch for PR #9.
Read live #2/#5 and the current project instructions. Enlarged the navigation title
from the inherited 14px to 20px, added gray inactive/disabled button surfaces, and
moved host/cloud/read-only text to the desktop sidebar bottom. The standalone host
opts into a full-viewport shell with an independently scrolling main area; navigation
resets main scroll to the new page top. Narrow containers use a compact top navigation
and scroll main below it. SPFx retains host-owned sizing by default; no document-wide
shared styles or changes to its adapter were introduced.

Home now explains Catalog, Permission, Definition, resource/service/family grouping,
same-name Application/Delegated merged rows and catalog boundaries in English.
Source metadata is preserved in collapsed Catalog data details rather than occupying
the main introduction. Replaced the long Browse button with keyboard-accessible
resource cards: Microsoft Graph opens the catalog, Power BI/SharePoint are disabled
Coming soon placeholders. Cards wrap at 240–340px width and share 200px height;
containers smaller than the minimum may shrink them to avoid horizontal overflow.

Final verification with Node 22.16.0 / npm 10.9.2:
- `npm run typecheck`: passed.
- `npm run build`: shared/API/Vite/SPFx build, lint and package passed.
- `CATALOG_TEST_API_PORT=3100 CATALOG_TEST_WEB_PORT=5273 npm run test:browser`:
  22/22 Chromium tests passed. Includes viewport-height/sidebar/footer geometry while
  scrolling, navigation scroll reset, resource widths at 1754/1000/800/360/320px,
  equal heights, disabled cards, keyboard entry and the prior catalog regressions.
  [Sanitized final log](verification/phase-3/home-sidebar-browser.log.txt) and
  [Home screenshot](verification/phase-3/home-sidebar.png).
- In-app browser visually confirmed the updated Home and stationary sidebar during
  main scrolling. Original API/Vite processes at 3000/5173 were preserved.
- `git diff --check`: passed. Chinese comment audit: both changed source modules
  retain headers; 7/7 named declarations retain Chinese TSDoc. Manually checked
  purpose-first explanations, viewport/host boundaries and English domain terms.
  HTML and browser tests are excluded by purpose.

Execution limitations: sandbox Chromium could not initialize its macOS MachPort;
reran the local tests with approved sandbox escalation. A run overlapping the final
build had one EWS regression failure (the search retained Mail.Read); build/HMR
interference is a possible explanation, not proven. The final isolated full run above
passed after builds finished. No dependency, data or API logic changes: no reinstall,
local database migration/import or backend unit-test repetition. Test setup still uses
isolated imported data. SPFx actual SharePoint runtime remains unverified; successful
packaging is not runtime acceptance. Main model routing cannot be changed/independently
verified through this session; no global settings were changed and no subagents used.

Human handoff: updated step 2 of [the stage review checklist](verification/phase-3-human-review.md).
On desktop verify larger title, gray buttons, full-height stationary sidebar and bottom
labels; scroll the right area, then switch Home/Graph and expect the top of the new
page. Resize to narrow widths and verify wrapping, no horizontal overflow and keyboard
entry through the Graph card. Read the terminology/grouping text; expand data details
only when source metadata is needed. Record pass/change-needed/blocked with sanitized
evidence. This is a local review follow-up, not a new stage completion. Changes remain
uncommitted/unpushed for review; no external issue/PR writes, merge, issue closure,
deployment or next-stage work were performed.


## Research: SharePoint-hosted static catalog — 2026-11-17

Research requested separately from V1 stage delivery. Read the latest parent #2,
current stage #6, project instructions, shared contracts/client/UI, SPFx host,
query service and data documentation. No implementation stage was started.

- Feasible direction: retain the shared React/Fluent UI, provide a CatalogClient
  implementation backed by a validated JSON snapshot and browser-side queries.
  SharePoint-specific file access remains in the host adapter. No runtime Nest
  server, SQLite server or customer-provisioned Azure resource is required for
  this mode; the existing API mode can remain available.
- Preferred option: a versioned JSON snapshot in a dedicated SharePoint document
  library, read with SPHttpClient under the current user's SharePoint permissions.
  Prefer the same SharePoint origin; page access does not imply file access.
- Alternatives: Microsoft 365 Public CDN for explicitly public sanitized data;
  SharePoint Lists when item-level editorial maintenance is required; or a
  snapshot imported into the SPFx bundle when updates can follow app releases.
  A Lists-to-JSON publishing workflow can separate editing from runtime reads.
- Public CDN needs JSON allowed in its extension policy, accepts anonymous reads,
  and has propagation/cache implications. Actual cross-origin JSON fetch, MIME
  type and tenant policy must be validated before selecting it. Private CDN is
  not assumed to be a general-purpose authenticated JSON endpoint.
- Recommended snapshot includes schema/source/classification versions, resource
  and category metadata and all ordinary definitions, including disabled records.
  Preserve same-definition filters, same-name merging, detail allDefinitions,
  default disabled exclusion, RSC exclusion and source provenance. Publish a new
  immutable snapshot before switching a small current-version manifest.
- Read-only measurement command: Python stdlib json/gzip over the tracked source.
  Actual source: 941,599 bytes; minified: 809,124 bytes; minified gzip: 110,361 bytes
  (local compression only, not a measured SharePoint HTTP response). Ordinary
  definitions: 1,664; distinct values: 1,036; separate RSC records: 60.
- Inspected current client: it sends credentials: omit and constructs API routes;
  changing only apiBaseUrl to a SharePoint file URL will not implement this mode.
- Next reviewable work, if selected: one SharePoint-library JSON prototype, client
  query parity checks against the existing API and actual SharePoint page testing
  for file permissions, refresh/rollback, narrow layout and load/query latency.

Official references consulted:
- [SPHttpClient and authentication cookies](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/connect-to-sharepoint)
- [File content through SharePoint REST](https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins/working-with-folders-and-files-with-rest)
- [Microsoft 365 CDN, JSON policy and caching](https://learn.microsoft.com/en-us/microsoft-365/enterprise/use-microsoft-365-cdn-with-spo?view=o365-worldwide)
- [SPFx packaged assets and app-catalog hosting](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/web-parts/get-started/hosting-webpart-from-office-365-cdn)
- [SharePoint list operations](https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins/working-with-lists-and-list-items-with-rest)

Validation scope: source inspection, local byte/count measurement and current
Microsoft documentation research only. No application tests/builds, tenant file
requests or browser performance tests were run. No application code, dependencies,
local database or pre-existing worktree changes were modified. No commit, external
comment, issue/PR update, merge or deployment was performed. Model routing cannot
be independently verified or changed through this session; no global settings or
subagents were used. This note is not a stage-completion or runtime-acceptance claim.

## Stage 4 independent review and delivery — 2026-11-17

Read live #2/#5/#6, #5's follow-up comments, applicable AGENTS.md and this plan.
The clean checkout was already main; `git fetch origin` confirmed HEAD = origin/main
`53d85a1`. PR #7/#8/#9 were independently confirmed merged, and their commits are
ancestors of main. Git showed one worktree and no local source changes; no attached
worktree existed. Earlier unmerged stage records above are historical. No previous
branch or personal input path was used.

Reviewed latest main first (Option A). Created `codex/phase-4-review-delivery` only
once documentation/focus fixes were identified. Retained all #5 follow-ups: shared
current criteria across levels, independent Accordion expansion, stable helper-free
toolbar, Home terminology/cards and fixed standalone sidebar. No dependencies,
contracts, data, classification or database behavior changed.

A bounded independent read-only reviewer inspected data/import/query/classification,
UI/accessibility and host boundaries. It found incorrect duplicate-value wording in
data/README and a focus candidate. The main agent reproduced Exchange → no-match
search → keyboard Back losing focus on baseline main; the retained failing browser
log records the old behavior. Fixed return focus to fall back to the first-level
heading when current criteria removed the original category card. Two tests cover
GUID matches in a different category and global no results, query/count preservation
and subsequent Shift+Tab. Corrected the source guide to distinguish GUID uniqueness
from valid same-value definitions. The reviewer rechecked both final fixes and found
no remaining actionable issue. Main agent owns integration, documentation and Git.

Clean reproduction used a new empty directory extracted by `git archive 53d85a1`,
with no dependencies, builds, .env or database. Node 22.16.0/npm 10.9.2. Commands:
- `npm ci`: passed, 1,424 packages. Existing checkout install also passed; local
  database and development services were not used by acceptance.
- `npm run verify:data`: passed; pinned SHA256 and 788/876/60 collections, 4 disabled.
- `npm run typecheck`: passed on main and after the focus fix.
- `npm test`: 14 passed; isolated SQLite/HTTP/CLI, rollback and independent query oracle.
- `npm run build`: passed on main and after fix, including Vite/SPFx production lint,
  build and .sppkg. Final package hash/size recorded; local review copy under ignored
  `var/phase4-delivery/`, never committed.
- `npm run check:react`: passed; runtime dependency/host boundaries unchanged.
- `SQLITE_PATH=./var/phase4-clean.sqlite npm run db:migrate`, then `npm run import:data`
  twice with that path: passed; 1,664 definitions, repeated import reused same version.
- `PORT=3217 CORS_ORIGINS=http://localhost:5317 SQLITE_PATH=./var/phase4-clean.sqlite npm run start:api`:
  actual new HTTP process read the CLI database; health/resources/categories/permission/
  Mail.Read checks, 1,660 enabled / 1,664 all / 1,036 merged names / 60 excluded RSC,
  GET CORS and OPTIONS 204 passed. Stopped only this verification process.
- `CATALOG_TEST_API_PORT=3216 CATALOG_TEST_WEB_PORT=5316 npm run test:browser`:
  final 24/24 passed, 28.2s. Uses its own real Nest/imported in-memory DB and Vite,
  preserving existing services. Final builds completed before browser testing.
- Chinese comment audit: independent baseline 25 source modules/103 documented
  declarations; changed UI file header and 7/7 declarations pass AST and manual
  review of purpose-first wording, rules/data flow, key fallback and retained English
  terms. Config/tests/fixtures/generated/static excluded by purpose; English product
  text, errors and contracts unchanged. `git diff --check` passed.

Evidence: [complete #2 mapping, review and commands](verification/phase-4.md),
[logs/screenshots/package manifest](verification/phase-4/),
[human-review checklist](verification/phase-4-human-review.md).
Source-only main was verified, then only the UI fix/tests were copied into that clean
installation for final typecheck/build/browser. Documentation needs no reinstall.
Chromium initially failed under macOS sandbox MachPort restrictions; approved reruns
produced the baseline defect and final successful suite. Upstream npm deprecations,
Vite size warning and Heft zero Web Part Jest suites remain visible. No hosted CI or
other target browser/platform acceptance is claimed. Main model routing cannot be
independently verified/switched with current tools; reviewer override was explicitly
Sol/medium and successfully launched; no global settings were changed.

**SharePoint actual package/page runtime and same-data Vite/SPFx comparison remain
pending**, including real host lifecycle/theme/style isolation and narrow columns.
No accessible authorized tenant/deployment was supplied; no tenant was accessed.
Minimum prerequisites/actions and expected results are in the human checklist.
#2 is not fully accepted; no issue was closed, no PR merged, no test/production/Azure
deployment made, and no next stage started. Publication identifiers follow below.

### Stage 4 publication and user handoff

Implementation/evidence commit:
[`8d84f2d`](https://github.com/VigilanteWang/graphpermlist/commit/8d84f2d42f1f19475a35543fe275cd7b30c07ee0).
Stage-only [PR #10](https://github.com/VigilanteWang/graphpermlist/pull/10) targets main,
is Ready for review, and references #2/#6. Pushed without rewriting history.
Published the actionable [#6 human-review checklist](https://github.com/VigilanteWang/graphpermlist/issues/6#issuecomment-6948964704):
reproduce setup and counts, inspect independent fixes and all #2 mapping rows, repeat
keyboard/layout/error checks, then obtain an authorized test environment before actual
SharePoint/same-data comparisons. Expected results and unverified scope are preserved
in [the local checklist](verification/phase-4-human-review.md).

This publication update is documentation only: checked relative links, privacy/path
scan and `git diff --check`; no runtime tests repeated. Next action belongs to the
user: review PR #10, record pass/change needed/blocked and decide separately on merge
and SharePoint test authorization. #2/#6 remain open; no merge, issue closure,
deployment or further stage work was performed. Stop at this handoff boundary.

Final commit-range hygiene follow-up: `git diff --check origin/main...HEAD` exposed
upstream tool output trailing spaces in retained build/reproduction logs. Normalized
only those logs, preserving command results; checked the staged whole-stage diff
against main. No source change or runtime rerun was needed.


## Research follow-up: SPFx solution boundaries — 2026-11-17

Evaluated the requested SharePoint-library JSON direction against current manifests,
CatalogClient, shared UI hooks, SPFx/Vite entry points, import/query services and
boundary checks. Read current parent #2 and stage #6; this is architecture research,
not execution of another V1 stage.

Recommendation: reuse packages/ui and the existing apps/spfx host. The repository,
workspace packages and deployable SPFx solution are separate boundaries: a shared
repository does not require Nest/SQLite or the Vite host in the deployed sppkg.
A second SPFx solution can also reuse the same UI if independent app identity,
parallel deployment or release ownership becomes an actual requirement. Rebuilding
or copying the UI creates duplicate maintenance without simplifying JSON querying.

Proposed implementation boundaries, not yet implemented:
- Move the data-reader interface from api-client to contracts, keeping UI independent
  of the selected transport. Use source-neutral loading/error descriptions.
- Keep SharePoint authentication, SPHttpClient, configuration and file loading inside
  apps/spfx; pass validated catalog data into browser-safe query functions.
- Extract only pure filtering/merging/count/detail rules into a small shared query
  module/package; do not import Nest providers, entities, TypeORM or Node-only file
  and crypto modules into browser packages. Keep publication validation/export offline.
- Keep the HTTP client in api-client and preserve web/API as separate entry points.
  Default the new SharePoint experience to JSON; add multiple runtime data-source
  modes only when required, with existing Web Part configuration migration considered.
- Existing root npm ci/build cover the whole workspace, including backend dependencies.
  Reusing source does not isolate installation/release workflows automatically;
  define a frontend-specific build entry and verify the resulting package imports.

Verification: read-only manifest/source inspection and current Microsoft guidance
on shared packages and packaged asset hosting. No prototype, build, tests or actual
SharePoint deployment/runtime verification performed. Only this research record was
edited; no application or dependency changes, Git publication or external comments.
Implementation acceptance should compare JSON and API query results and inspect
actual SharePoint page behavior and the packaged browser dependencies.


## Planned increment: two SPFx solutions and three shared-UI entries — 2026-11-17

User decision supersedes the optional single-SPFx recommendation in the earlier
research note: retain the API SPFx and add a second, independently deployable JSON
SPFx solution. The standalone website plus both SPFx entries share one UI through
host-injected data clients. Do not duplicate UI or replace the two packages with a
single Web Part data-source switch.

Created the separate parent requirement and four sequential stage issues, following
#2/#3–#6's independent stage PR and new-chat handoff process:

- Parent [#11](https://github.com/VigilanteWang/graphpermlist/issues/11): SharePoint
  document-library JSON, two independent SPFx solutions/sppkg and three shared-UI entries.
- [#12](https://github.com/VigilanteWang/graphpermlist/issues/12): neutral contracts,
  browser-safe query core and existing API/website/SPFx regression.
- [#13](https://github.com/VigilanteWang/graphpermlist/issues/13), depends on #12:
  versioned JSON export/validation and browser catalog client.
- [#14](https://github.com/VigilanteWang/graphpermlist/issues/14), depends on #13:
  new JSON SPFx solution and three-entry shared UI integration.
- [#15](https://github.com/VigilanteWang/graphpermlist/issues/15), depends on #14:
  independent review, clean reproduction and actual SharePoint acceptance.

Each child has explicit scope, acceptance, predecessor/successor, an independently
usable new-chat prompt, stage-only commit/push/PR/checklist authorization, and a stop
boundary. Stage PRs must enter verified main before the next stage starts. No merge,
issue closure, tenant upload/permission change or deployment is implicitly authorized.
Stage 1 will create docs/sharepoint-json-plan.md and update the repository-local
increment scope; this planning turn does not implement that stage.

Verification performed: read current #2–#6 and local instructions/manifests/plan;
GitHub PR metadata confirmed #10 merged at c6310f3 (historical handoff text above
records its earlier unmerged state). Searched existing issue titles for JSON to avoid
duplicate planning. Created #11–#15 through the GitHub connector, finalized bidirectional
links/task lists and exact stage prompt numbers, then fetched all five issues and
compared their complete bodies with the intended text: all matched and remain open.
Draft checks covered required solution/UI/source boundaries, Markdown fences,
unresolved placeholders and personal/tenant path leakage. git diff --check passed.

Only this plan record was appended, preserving pre-existing local changes. No source,
manifest, lockfile, database, build or tenant changes; no implementation tests were
needed. No commit/push, PR creation, merge or deployment was performed. No subagents
or global model-setting changes were used. Start #12 in a separate conversation using
its published prompt when ready; actual SharePoint runtime remains unverified.


## SharePoint JSON stage 1 — #12

Parent [#11](https://github.com/VigilanteWang/graphpermlist/issues/11) is a separate
increment over the merged V1 baseline. [Increment decisions, commands and handoff](sharepoint-json-plan.md)
record #12 contracts/query-core work and the #13–#15 stop boundaries. Preserve all
V1 records and actual SharePoint runtime gaps. The earlier uncommitted planning
appendices above were present before #12 and are retained with this stage.

#12 delivered the neutral contracts/core and preserved current HTTP/Vite/API SPFx
behavior in implementation commit
[ac70855](https://github.com/VigilanteWang/graphpermlist/commit/ac70855115ed9dc53668e4e265bffaf6bd0d78c2).
[PR #16](https://github.com/VigilanteWang/graphpermlist/pull/16) is Ready for review.
[Stage review comment](https://github.com/VigilanteWang/graphpermlist/issues/12#issuecomment-6951418159)
and [retained checklist](verification/spfx-json-1-human-review.md) provide reproducible
manual acceptance. npm ci/verify:data/typecheck, 26 Node tests, full Vite/SPFx build,
React/shared dependency checks, isolated CLI + standalone HTTP and 26 Chromium cases
passed; complete commands/results/limits are in the increment plan. JSON runtime,
second SPFx and actual SharePoint remain future/pending scope. No merge, issue closure,
tenant upload or deployment; stop at #12 and wait for user review/merge/new-chat #13.

## Shared UI organization follow-up — 2026-11-17

On the existing #12 stage branch, the user requested a responsibility-based UI
refactor and durable local conventions. See the
[follow-up scope, verification and review handoff](sharepoint-json-plan.md#12-follow-up-shared-ui-organization--2026-11-17),
[packages/ui rules](../packages/ui/AGENTS.md) and
[source map](ui-development.md#source-organization). The public shell/props and
host usage stay compatible; current criteria, expansion and focus remain with the
same state owner. This maintenance does not start #13 or resolve actual SharePoint
runtime gaps. Changes remain local for review; no merge/deployment/issue closure.

## Shared UI component/Fluent follow-up — 2026-11-18

The user requested deeper shell extraction, component-local components/hooks folders
and Fluent UI replacements after inspecting the first refactor. See
[final structure, component audit, references and verification](sharepoint-json-plan.md#12-follow-up-component-local-folders-and-fluent-ui--2026-11-18).
The shell now composes focused children and Hooks; Home, DetailsPanel and PermissionGrid
have local subdirectories. Controlled Fluent Nav, shared metadata Table, source
Accordion, Card surfaces and typography preserve existing data and interactions.
Typecheck, 26 Node tests, full Vite/API SPFx build, React/dependency checks and 28
Chromium cases passed; Chinese-comment/visual/read-only reviews and remaining
SharePoint limits are recorded in the increment plan. Local reviewable changes only;
no merge, deployment, issue closure or #13 work.

## Shared UI follow-up submission — 2026-11-18

The user authorized submitting the conversation's UI/source/test/documentation
changes on the existing #12 branch and updating PR #16. See the
[publication record](sharepoint-json-plan.md#shared-ui-follow-up-publication--2026-11-18)
for identifiers and the updated review handoff. This supersedes the earlier local-only
notes; no merge, issue closure, tenant deployment or #13 work is authorized.

Submitted UI implementation:
[908c31a](https://github.com/VigilanteWang/graphpermlist/commit/908c31a6246e8628cbd0b0e1bf7f012ffad762f5),
pushed to the existing stage branch. PR #16's title/body now reflect the final scope;
[#12 follow-up review checklist](https://github.com/VigilanteWang/graphpermlist/issues/12#issuecomment-6954582535)
was published and read back. PR remains open/Ready, with actual SharePoint acceptance
pending. This publication-record update changes documentation only.

## Contracts organization follow-up

The existing #12 branch groups the shared TypeScript contracts by query, HTTP,
and JSON publication. See the [contract follow-up](sharepoint-json-plan.md#12-follow-up-contract-modules-and-names)
for the naming conventions, verification and handoff.

## SharePoint JSON stage 2 — #13

[Stage 2 delivery, commands and human review](sharepoint-json-plan.md#stage-2-delivery-and-verification)
records the #16 prerequisite merge, shared import model, offline publication,
strict validation, session JSON client, isolated real HTTP comparison and browser
regression in [PR #17](https://github.com/VigilanteWang/graphpermlist/pull/17).
The [issue review checklist](https://github.com/VigilanteWang/graphpermlist/issues/13#issuecomment-7015149708)
links to the verified commands and expected results. The existing API SPFx package
is available from the production build.
The independent JSON SPFx and three-entry integration remain #14 work. Review and
merge #13 before starting that stage in a separate chat.
