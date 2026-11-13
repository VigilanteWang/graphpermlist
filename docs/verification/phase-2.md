# Stage 2 verification — 2026-11-13/14

Environment: macOS arm64, Node v22.16.0, npm 10.9.2. Commands below were executed.
Retained transcripts normalize the repository path to `<repo>` and home to `<home>`.
No credentials, tenant source metadata or generated databases are committed.

## Prerequisite and commands

Live PR #7 was merged; origin/main was fetched at
`81682a92b6280d425b06e05c9d1c303e3e8c8d63`. Stage 1 files and the original
[phase 1 evidence](phase-1.md) were read. A fresh branch,
`codex/phase-2-catalog-api`, starts from that merged commit.

Before implementation, the merged main passed:

| Command | Result | Transcript |
| --- | --- | --- |
| `npm ci` | Exact lockfile accepted; native better-sqlite3 loads | [install](phase-2/baseline-install.log.txt) |
| `npm run verify:data` | Expected digest; 788/876/60, disabled 2/2/0 | Repeated via source-loader tests below |
| `npm run typecheck` | Passed | [types](phase-2/baseline-typecheck.log.txt) |
| `npm test` | 6/6 passed | [tests](phase-2/baseline-tests.log.txt) |
| `npm run build` | API/Vite/SPFx build/package passed | [build](phase-2/baseline-build.log.txt) |
| `npm run test:browser` | 2/2 passed | [browser](phase-2/baseline-browser.log.txt) |

Chromium initially could not register a macOS Mach port under sandbox restrictions;
rerunning with permission to launch the local browser passed. This was an execution
restriction, not a product failure. No dependency/toolchain changes were needed.

After implementation, all required stage checks passed:

| Command | Result | Transcript |
| --- | --- | --- |
| `npm run verify:data` | Same source digest and counts; shared prebuild/CLI validation | [data](phase-2/data.log.txt); source-loader/full-field tests |
| `npm test` | 14 tests, 0 failures | [API/CLI/transaction tests](phase-2/api-tests.log.txt) |
| `npm run typecheck` | All workspaces and typed fixtures passed | [types](phase-2/typecheck.log.txt) |
| `npm run build` | Shared/API/Vite/SPFx production build, lint and .sppkg passed | [build](phase-2/build.log.txt) |
| `npm run check:react` | React 18.3.1 / SPFx external boundaries preserved | [boundaries](phase-2/boundaries.log.txt) |
| `npm run test:browser` | 2 Chromium tests passed, real Nest/Vite, 360px, error/retry | [browser](phase-2/browser.log.txt) |
| `git diff --check` | Passed | No whitespace errors |

Manual CLI smoke against an isolated SQLite file executed `npm run db:migrate`,
then `npm run import:data` twice. It applied `CatalogSchema1794528000000`, imported
1,664 definitions and reused the same version on the second import. The automated CLI
case repeats these exact entry points on a new disk database and then opens a distinct
Nest HTTP context against that file, so final source and persisted readback are covered.
The CLI uses an application context, not an HTTP listener; PORT=1 in the CLI test does
not affect success. Both successful and failing subprocesses exit within the test timeout.

## Semantic evidence

`tests/catalog.test.mjs` uses the real checked-in safe snapshot as test input, separate
from the synthetic modifications confined to temporary files/databases. Nothing under
tests/fixtures is imported into a production catalog.

- Full snapshot: Application 788 + Delegated 876 = 1,664 ordinary definitions,
  1,036 merged values. All official normalized fields and stored raw fields are
  compared to source. RSC 60 are excluded. Default visibility removes four disabled
  definitions, yielding 1,660. Resource IDs are Graph's App ID.
- Mail.Read has two types/GUIDs and distinct consent rules; User.Read is delegated
  only. GUID searches restrict matching definitions while detail allDefinitions
  retains both complete definitions. A modified fixture with one disabled Mail.Read
  type confirms hidden labels with full status still present in detail.
- Type/consent/enabled/text filters are checked against an independent source-field
  oracle, including literal false, all search field types, every category, exact
  families, OIDC, mixed-case/trimmed text, no results and SQL-looking literal text.
  Categories/list totals and per-category counts agree for every query combination.
- Unknown resource/value and filtered-out details return 404; malformed UUID,
  unknown/repeated parameters and invalid booleans return 400. Unimported state,
  CORS and default 500 body redaction remain covered by tests/api.test.mjs.
- Same active input/classification preserves version, timestamp and counts. A valid
  modified fixture produces a new version, different digest and dynamic counts:
  1,666 definitions / 1,037 values; the unknown family survives as Uncategorized,
  user-only app roles are omitted, and two same-type GUIDs sharing one value survive.
- Corrupt JSON, empty/malformed collections, duplicate GUIDs and unsupported
  credential fields leave every catalog table and the active API response unchanged.
- A SQLite trigger aborts a new definition insert after earlier batches have written;
  every catalog table count and active response rolls back. Another trigger aborts
  publication after deactivating the old version; the old active version is restored.
- Concurrent calls in one application context serialize; the first publishes and the
  second reuses it. Historical definitions remain unchanged. Primary/FK constraints
  reject duplicate identities and missing family references.
- Migration runs twice without schema duplication. Nest resolves injected Controller,
  CatalogService, CatalogImportService, Repository and DataSource. Connections close.

Classification rules and per-category all-definition counts are in
[classification](../classification.md). Its version preserves all 1,664 definitions;
189 definitions / 113 values remain conservatively Uncategorized. Classification
checks cover exact-before-family priority, complete hyphenated prefixes, all OIDC
values and prototype-like/unknown names.

## Independent review and limits

An explicit GPT-6.1 Sol/medium subagent implemented only the bounded classification
files, then performed a read-only review of importer/query/schema/CLI correctness.
The main agent integrated and reviewed those files, owned all other source,
configuration, tests, dependencies and Git operations. Main-conversation model cannot
be independently switched or verified by this session's tools; no global settings changed.

Review reproduced a CLI initialization failure that printed a local database path
before the catch handler. Setting `abortOnError:false`, quieting context initialization
and retaining one fixed CLI error eliminated the leak; regression checks cover invalid
source and `/dev/null/...` database initialization. The reviewer re-ran that reproducer
and examined genuine partial-write/publication rollback and independent disk readback,
with no remaining blocking issue reported.

SPFx passed build/lint/package only, not deployment or SharePoint runtime acceptance.
The current frontend remains the stage 1 shared connectivity shell; full browse UI
belongs to #5. Browser tests start a migrated, unimported :memory: database explicitly.
No SQL Server runtime, cross-process concurrent-writer success, history pruning,
hosted CI, other platforms, live Graph collection or tenant authorization behavior
is claimed. No issue was closed, PR merged or deployment performed.
