# Stage 3 verification — 2026-11-17 (Asia/Shanghai)

Scope: issue #5, parent #2. Baseline `b13d5c94887061f57e14c165fbc37cff45a57663`
was clean main/origin/main after fetch. GitHub confirmed PR #7 and #8 merged; the
stage starts on new `codex/phase-3-permissions-ui`, not a merged implementation branch.
The single existing checkout was reused; no user edits or other worktrees were present.

## Delivered behavior

- One shared English Fluent UI v9 catalog for Vite/SPFx: Home/source information,
  fixed resource navigation, global Graph categories, scoped family Accordion/DataGrid,
  search, type/admin consent/family/disabled filters, matching counts and full details.
- API matching definitions drive rows/labels; `allDefinitions` drives complete details,
  including hidden types, disabled definitions and Delegated user consent wording.
  Official titles/descriptions are never replaced with generated summaries.
- Abort plus success/error guards isolate obsolete responses. Root and category levels share the current query criteria (updated in the follow-up below); search expansion is temporary and clearing restores browsing.
  Details provide loading/error/Retry, Clipboard success and manual-copy fallback.
- Scoped styles, container-width adaptation, visible keyboard focus, modal focus
  containment, trigger/card focus restoration and reduced motion support.
- SPFx keeps one React root/client per configuration, maps inverted theme to dark
  Fluent mode and unmounts on disposal; Vite HMR unmounts its root. Direct SPFx theme
  types are explicitly declared with the already locked 1.24.1 package.
- Loopback HTTPS proxy and [configuration/acceptance guide](../ui-development.md).

## Actual commands and results

Node 22.16.0 / npm 10.9.2, macOS arm64. Logs below redact checkout/cache locations.

| Command | Result/evidence |
| --- | --- |
| `npm ci --cache <temporary-npm-cache>` | Pass, 1,424 packages; [install log](phase-3/install.log.txt) |
| `npm run verify:data` | Pass; 788 Application, 876 Delegated, 60 excluded RSC, four disabled; [log](phase-3/data.log.txt) |
| `npm run typecheck` | All workspaces and test types pass; [log](phase-3/typecheck.log.txt) |
| `npm test` | 14 tests pass; existing transactional/import/API/CLI/client semantics retained; [log](phase-3/tests.log.txt) |
| `npm run build` | Shared/API/Vite plus SPFx production build/lint/package pass; [log](phase-3/build.log.txt) |
| `npm run check:react` | UI and hosts resolve React 18.3.1, pinned externals and clean shared boundaries; [log](phase-3/boundaries.log.txt) |
| `npm run test:browser` | 18 real Chromium tests pass; [log](phase-3/browser.log.txt) |
| `node --check scripts/serve-api-https.mjs` | Pass; [log](phase-3/https-syntax.log.txt) |
| `npm run db:migrate`, `npm run import:data` twice, `npm run start:api`, `node scripts/serve-api-https.mjs` | Disposable file DB, real snapshot, second import reused; TLS/CORS smoke below; [log](phase-3/https.log.txt) |
| `git diff --check` | Pass |

The first default-cache dependency-add attempt was denied cache writes by the sandbox;
using a disposable writable npm cache succeeded. Final clean install uses that cache.
Browser execution initially required the approved macOS process permission rerun.
These environment restrictions did not require changing dependencies or browser security.

The Vite bundle is about 526 kB (151 kB gzip) and emits its >500 kB advisory; build
succeeds. No code splitting or broad dependency upgrade was introduced. Upstream
SPFx/tooling deprecation notices remain. SPFx Heft reports **zero Web Part-specific
Jest suites**; it is build/packaging evidence, not a runtime test.

## Browser evidence and corrections

The browser launcher migrates isolated in-memory SQLite and imports the actual
versioned source via CatalogImportService. No fixture catalog replaces successful API
responses. Only explicit loading, not-imported and error tests intercept responses;
request-race tests delay real responses. Each test starts with fresh browser state.

18 tests cover Home/navigation, global category counts, GUID/official-title search,
service scope, same-definition type/admin filters, family and disabled filters,
Mail.Read/User.Read official fields and allDefinitions, name/GUID Clipboard, denial
fallback, loading/unimported/errors and Retry at all request levels, stale search
responses, temporary expansion and restoration, continuous typing, keyboard opening,
Escape/Close and focus return, 320/360px screens and a 320px embedded container,
long text, drawer viewport anchoring, motion/no-motion and sibling style isolation.
The modal test cycles eight Tab presses and verifies focus remains inside the dialog.

An independent static review found search-response effects stole focus; effects now
separate navigation focus from data updates, and sequential typing regression passes.
Browser testing found temporary disabled Copy buttons dropped focus to body, preventing
Escape; copying now keeps the button focusable and guards repeated calls. Escape and
trigger restoration pass after actual GUID copying. ResizeObserver/animation assertions
wait for layout completion rather than treating transient frames as stable geometry.

Screenshots were inspected after animations completed:
[Home](phase-3/catalog-home.png), [categories](phase-3/catalog-categories.png),
[family DataGrid](phase-3/catalog-category.png),
[320px complete-detail viewport](phase-3/catalog-details-narrow.png).
The modal viewport rect is top 0, right 320, height 800 in the narrow test.
Sibling style checks are a local embedded-host check, not SharePoint evidence.

## HTTPS/CORS and source-comment acceptance

A disposable file database was migrated, imported twice and read through a separate
HTTP process. A temporary self-signed localhost/SAN certificate was explicitly trusted
by the smoke client's CA context (no system trust was changed). The HTTPS proxy returned
real imported resources with 1,660 enabled definitions; exact-origin CORS GET and OPTIONS
204 passed, an unlisted origin received no matching permission, and POST was rejected.
Temporary certificate, key, database and servers were removed. This proves the local
TLS/proxy/CORS path; it does not prove a SharePoint browser trusts or can reach it.

Comment scope: three UI source modules, two host entries and the HTTPS utility.
TypeScript AST inspection found Chinese module headers and **28/28** named declarations
with TSDoc/JSDoc; [audit](phase-3/comment-audit.json). Manual review checked “what it is”
first, key rules/cancellation/state restoration, domain terminology and accuracy.
Product strings, API errors and official fields remain English. Configuration, tests,
fixtures, generated code and HTML are excluded by their purpose. No data contract or
source snapshot changed. New source/docs/logs were checked for personal paths and secrets.

## Unverified scope and handoff

**SPFx production package generated; actual SharePoint page NOT tested.** No tenant,
test deployment permission or package upload was available/used. No deployment occurred.
Same-data results across actual hosts, package loading, property updates, disposal,
host dark/light/theme contrast, neighboring Web Parts and narrow SharePoint columns
require the explicit tenant checklist. No Firefox/Safari/Edge version, other platform,
hosted CI, assistive-technology certification or tenant consent behavior is claimed.

Implementation: [`f6c8074`](https://github.com/VigilanteWang/graphpermlist/commit/f6c807494fa88e940eefaa6ba62df47054fe9db8),
[PR #9](https://github.com/VigilanteWang/graphpermlist/pull/9) against main.
Use the [human-review checklist](phase-3-human-review.md), also published in
[issue #5](https://github.com/VigilanteWang/graphpermlist/issues/5#issuecomment-6922262201),
and the stage PR for acceptance.
Review/merge is a separate user decision. Keep #5 and #2 open; do not start #6 until
this PR merges and the user explicitly starts that stage.


## Review follow-up: synchronized search criteria — 2026-11-17

The reported sequence was reproduced against the pre-fix UI: visit Exchange, use
Mail.Read/Application/Mail, return to categories, change to Delegated/EWS, then re-enter
Exchange. The regression failed because the search field reverted to Mail.Read.
The initial design cached query criteria per category and only copied the root query
on the first visit, so later visits restored obsolete criteria. That behavior is superseded.

The toolbar now owns one shared criteria state for text/type/admin consent/family/
Show disabled. Navigation only adds/removes the category scope; entering, returning,
and using the resource navigation retain the current criteria in both directions.
Only Accordion expansion remains category-specific; search/clear restoration is preserved.
The existing return-state assertion was corrected to this behavior, and a real-API
regression covers repeated visits, every control, current counts and scoped rows.

The regression environment used ports 3100/5273 because the user's 3000/5173 services
were already running. Test ports are now configurable and propagate to Nest, Vite and
HTTP oracle checks; the user's services were not stopped or reused. During regression,
the old narrow-layout assertion exposed modal scrollbar locking reserving 15px while
Drawer width still used vw; max-width now uses the containing width and the test checks
both panel edges stay visible rather than assuming an overlay-scrollbar configuration.

Validation and the review handoff are recorded in the implementation plan; current
browser evidence: [search-criteria regression](phase-3/search-criteria-browser.log.txt).
SharePoint page runtime remains unverified, and no deployment/merge is authorized.
