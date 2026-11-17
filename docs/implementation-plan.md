# Implementation plan

Parent: [#2](https://github.com/VigilanteWang/graphpermlist/issues/2).
The latest issue body is authoritative. This plan records implementation evidence.

## Stages and workflow

1. [#3 Foundation](https://github.com/VigilanteWang/graphpermlist/issues/3): merged via [PR #7](https://github.com/VigilanteWang/graphpermlist/pull/7) into main at `81682a9`; code and baseline reverified before #4.
2. [#4 Data and API](https://github.com/VigilanteWang/graphpermlist/issues/4): merged via PR #8 at `b13d5c9`; #3/#4 closed on explicit user authorization when starting #5.
3. [#5 Shared UI](https://github.com/VigilanteWang/graphpermlist/issues/5): implemented and locally verified on `codex/phase-3-permissions-ui`; stage 3 handoff below.
4. [#6 Review and delivery](https://github.com/VigilanteWang/graphpermlist/issues/6): not started.

Option A: independent stage PRs against updated main. Stage 1 has no predecessor.
Initial checkout had only LICENSE at `475693b`; no existing plan/AGENTS or PR.
The untracked source export is preserved and ignored; sanitized input is versioned under data/.
Do not merge, close current/parent issues, deploy or automatically begin #6.

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
remains unverified; packaging is not runtime acceptance. Append this review fix to
PR #9 and verify no helper text or select-width jump on category entry/return.
No data/API/dependency changes; no install or local database migration/import needed.
