# Stage #6 independent review and delivery

Parent [#2](https://github.com/VigilanteWang/graphpermlist/issues/2), stage
[#6](https://github.com/VigilanteWang/graphpermlist/issues/6). Verified 2026-11-17
(Asia/Shanghai). **Local regression and both production builds pass. Actual
SharePoint runtime and same-data cross-host acceptance remain pending; #2 is not
fully accepted and nothing has been deployed.**

## Baseline and retained stage #5 changes

Read the latest #2/#5/#6 bodies, #5 review comments, applicable AGENTS.md and the
implementation plan. The checkout was clean on main, with one Git worktree and no
attached worktree/PR artifacts. After fetch, HEAD and origin/main were both
`53d85a1af7d2201a13966939eb2230f99d10dba5`. Live PR metadata and Git ancestry confirm:

| Stage | Merged PR | Merge commit | Evidence |
| --- | --- | --- | --- |
| #3 | [#7](https://github.com/VigilanteWang/graphpermlist/pull/7) | `81682a9` | [Foundation](phase-1.md) |
| #4 | [#8](https://github.com/VigilanteWang/graphpermlist/pull/8) | `b13d5c9` | [Data/API](phase-2.md) |
| #5 | [#9](https://github.com/VigilanteWang/graphpermlist/pull/9) | `53d85a1` | [Shared UI and follow-ups](phase-3.md) |

Issue #5 and older plan entries still described pre-merge states; code and live PR
merge evidence take precedence for prerequisites. No issue body or acceptance box
was changed. A stage-only branch `codex/phase-4-review-delivery` was created after
identifying real documentation/focus fixes, based directly on that main.

Preserved #5's current shared criteria across levels (only category scope changes),
Accordion expansion restoration, no search helper text, stable toolbar widths,
expanded Home introduction/resource cards and fixed standalone sidebar. The
TypeScript/CommonJS/ESM/SPFx rig baselines remain unchanged.

## Independent read-only review and verified fixes

A separate reviewer read actual loaders/import/query/classification/UI/host source,
contracts, tests and live requirements. It reported one confirmed documentation
issue and one focus candidate; the main agent reproduced the focus failure in real
Chromium before fixing it. The reviewer then re-read both final fixes and regression
tests and found no remaining issue in those changes. No dependency, lockfile, data,
API contract, classification or database behavior changed.

| Finding | Evidence and resolution | Regression |
| --- | --- | --- |
| Return loses keyboard location when current criteria remove the originating category | `packages/ui/src/index.tsx`: return effect could only focus the old category card. Exchange → a User.Read GUID or no-match query → keyboard Back removes that card. Now focus the card if present, otherwise the first-level heading. | [Baseline failure](phase-4/focus-before.log.txt); two added cases in `tests/browser/catalog.spec.ts`; final 24/24 pass. Tests check retained query, correct global counts, absent Exchange card, heading focus and subsequent Shift+Tab. |
| Source guide wrongly claimed duplicate values were rejected | `data/README.md`: corrected GUID uniqueness wording; different GUIDs sharing a value remain valid and preserved. | Reviewer validated a duplicate-value/new-GUID input. Existing `tests/catalog.test.mjs` verifies both same-type definitions survive import and display merge. |
| Plan/README delivery state was stale | Updated stage merge state, current Home usage, verification entry points and pending runtime status. Earlier plan history is explicitly historical. | Links, actual commands, final diff and privacy checks reviewed. |

Review covered data fidelity/RSC exclusion, classifications and unknown prefixes,
transactional publication/rollback and idempotency, matching-definition filtering,
merged counts, complete details, accessible keyboard UI, scoped styles, host-owned
React lifecycle/configuration and shared-package boundaries. No additional actionable
code issue was found; this is a scoped code/test review, not proof of all possible
runtime behavior. SPFx theme/root/disposal patterns were checked against Microsoft's
[BaseClientSideWebPart API](https://learn.microsoft.com/en-us/javascript/api/sp-webpart-base/baseclientsidewebpart?view=sp-typescript-latest)
and [React 18 upgrade guidance](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/react-18-upgrade).

## Clean reproduction and actual commands

Environment: macOS arm64, Node 22.16.0, npm 10.9.2, existing Playwright Chromium
1194. No global settings were changed. A source-only `git archive 53d85a1` was
extracted into a new empty temporary directory. It contained no node_modules,
.env, SQLite or build output. Reproduction can use:

```sh
review_dir="$(mktemp -d)"
git archive 53d85a1 | tar -x -C "$review_dir"
cd "$review_dir"
npm ci
npm run verify:data
npm run typecheck
npm test
npm run build
npm run check:react
export SQLITE_PATH=./var/phase4-clean.sqlite
npm run db:migrate
npm run import:data
npm run import:data
```

For the final branch, substitute its commit for `53d85a1`. This run first verified
main, then copied only the reviewed UI fix and browser test changes into that clean
installation and reran typecheck/build/browser sequentially. Documentation edits
need no reinstall. The existing checkout's npm ci also succeeded; its existing local
SQLite and development services were not used by acceptance. No original export,
personal path, Graph token, login, Docker or separate database service was needed.

| Actual command/action | Result | Retained evidence |
| --- | --- | --- |
| `npm ci` | 1,424 packages; exit 0 | [Install](phase-4/00-install.log.txt) |
| `npm run verify:data` | Correct pinned SHA256, 788/876/60 collections, 4 disabled | [Data](phase-4/01-verify-data.log.txt) |
| `npm run typecheck` | All workspaces/tests pass; repeated after UI fix | [Final typecheck](phase-4/09-final-typecheck.log.txt) |
| `npm test` | 14 tests pass, including isolated SQLite/HTTP/CLI and failure rollback | [Tests](phase-4/03-test.log.txt) |
| `npm run build` | Shared/API/Vite/SPFx production build, lint and .sppkg pass; repeated after UI fix | [Final build](phase-4/10-final-build.log.txt) |
| `npm run check:react` | Shared host boundary and React checks pass | [Boundaries](phase-4/05-check-react.log.txt) |
| `SQLITE_PATH=./var/phase4-clean.sqlite npm run db:migrate` | Explicit versioned schema applied | [Migration](phase-4/06-db-migrate.log.txt) |
| Same SQLite path, `npm run import:data` twice | 1,664 definitions, same version reused on second run | [First](phase-4/07-import-data.log.txt), [second](phase-4/08-import-data.log.txt) |
| `PORT=3217 CORS_ORIGINS=http://localhost:5317 SQLITE_PATH=./var/phase4-clean.sqlite npm run start:api` | New HTTP process reads persisted CLI database; health/resources/categories/permissions/Mail.Read and GET/OPTIONS CORS assertions pass | [HTTP summary](phase-4/11-persisted-http.json) |
| `CATALOG_TEST_API_PORT=3216 CATALOG_TEST_WEB_PORT=5316 npm run test:browser` | 24/24 real Chromium tests pass in 28.2s | [Browser](phase-4/12-browser.log.txt) |
| Chinese comment audit and `git diff --check` | Pass | [Audit](phase-4/comment-audit.json) |

The HTTP smoke used Python stdlib subprocess/urllib assertions and stopped only its
own API process. Read endpoints: `/api/v1/health`, `/resources`,
`/resources/{Graph App ID}/categories?showDisabled=true`, `/permissions` with/without
showDisabled, and `/permissions/Mail.Read`; it checked exact CORS origin and OPTIONS
204. Browser webServer invokes `npm run dev -w @graph/web` (the root `dev:web`
script delegates to the same command) with a separate real Nest server and migrated,
imported in-memory SQLite. Only state/failure scenarios intercept responses.

Initial sandbox Chromium launch failed before any page test (macOS MachPort
permission restriction); the approved local rerun produced the baseline regression
failure and final pass. Upstream installation deprecation warnings, Vite's chunk-size
warning and Heft's zero Web Part Jest suites remain visible. No dependency upgrade
or hosted CI claim is made. Logs replace local paths; generated version UUIDs are
local import identifiers, not tenant identifiers.

The final package size/hash are in [package manifest](phase-4/package.json).
`11-persisted-http.json` recorded the baseline package hash before the UI fix; use
`package.json` for the final artifact. Package ZIP creation is not byte reproducibility
across runs. Packages/local databases are ignored and are not committed.

## Parent #2 complete acceptance mapping

“Pass” below means the indicated local evidence, not a release authorization.

| #2 acceptance item (original order) | Implementation/evidence | Status |
| --- | --- | --- |
| 1. 788 Application + 876 Delegated = 1,664; four disabled; 1,660 default | Source loader/importer; data test, full-field API comparison and persisted HTTP summary | Pass |
| 2. 60 RSC excluded and visible in source metadata | ImportService, Home; API/source assertions and Home screenshot | Pass |
| 3. Conservation, merged/raw counts, unknown prefix retention | Classification/CatalogService; independent filter oracle, category sums, unknown-family import test; 1,036 merged names and 17 categories | Pass |
| 4. Reimport idempotent; corrupt/mid-failure cannot replace active snapshot | ImportService transaction; duplicate CLI import, injected insert/publish failures, persisted DB tests | Pass |
| 5. User.Read Delegated only; Mail.Read merged with two GUIDs/wording | CatalogService and PermissionViews; API and browser detail/clipboard tests | Pass |
| 6. Per-type consent differences and no cross-definition filter match | DefinitionField plus pre-merge filtering; API oracle, Application+Not required empty and browser checks | Pass |
| 7. Disabled/GUID/no-result/error/full detail | Query DTO/service/UI request hooks; API and real browser suite (injected errors distinct) | Pass |
| 8. Vite/SPFx same-data category/search/list/detail comparison | Both adapters statically use ExplorerShell/createCatalogClient; builds pass, actual SPFx comparison unavailable | **Pending runtime comparison** |
| 9. Both host build/runtime; real SharePoint package/styles/narrow width | Vite runtime and both production builds pass; embedded 320px/isolation tests are Vite-host simulations | **Partial — actual SharePoint pending** |
| 10. Back/transition/reduced-motion/keyboard/focus | Shared UI and 24 browser tests, including final fallback fix | Pass in Vite; SharePoint pending |
| 11. Repeatable install/migrate/import/start/build/test docs | README, operations/UI guides and clean run above | Pass locally |
| 12. Nest Controller/Service/Repository DI, isolated four routes/validation/errors | `tests/api.test.mjs`, `tests/catalog.test.mjs` | Pass |
| 13. Shared CLI/HTTP service/entities, connection close, no DB service | Nest context CLI; independent CLI processes, persisted HTTP reads, closure/bounded failure tests | Pass |
| 14. Real tenant required; build cannot imply runtime | Explicit pending status and [human checklist](phase-4-human-review.md) | Boundary recorded; runtime **not passed** |

Current snapshots remain conservatively classified: 189 definitions / 113 names in
Uncategorized. Classification is editorial navigation, not an authorization boundary.
Future snapshot counts are not generic importer limits. Other target browsers/versions,
OS/architectures, hosted CI, SQL Server provider and cross-process writer robustness
are not claimed. History growth/cleanup remains the separately recorded future work.

## Chinese source-comment acceptance

The independent baseline audit examined 25 hand-written program source modules and
103 named declarations: module headers and Chinese TSDoc/JSDoc were present.
Configuration, tests/fixtures, generated files and static HTML were excluded by purpose.
The only changed program source here is `packages/ui/src/index.tsx`: header and 7/7
interface/type/function declarations pass the main agent's TypeScript AST check.
Manual review confirmed purpose-first descriptions, state/data flow, the new focus
fallback reason, retained Graph terms, and unchanged English UI/errors/contracts.
No behavior was changed solely to add comments. See [audit](phase-4/comment-audit.json).

Screenshots from the final real-data run: [Home](phase-4/catalog-home.png),
[categories](phase-4/catalog-categories.png), [service](phase-4/catalog-category.png),
[narrow details](phase-4/catalog-details-narrow.png). Home was visually checked for
current counts, resource cards and retained sidebar layout.

## Handoff

Review this stage's independent PR and [human checklist](phase-4-human-review.md).
The implementation plan records publication identifiers and the issue checklist link.
Only a user decision authorizes merge, issue closure, test deployment or release.
No SharePoint tenant was accessed, no deployment was performed and no next stage was
started. Complete the authorized tenant comparison before treating #2 as fully accepted.
