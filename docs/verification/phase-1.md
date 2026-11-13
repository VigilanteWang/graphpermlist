# Stage 1 verification — 2026-11-13

Environment: macOS arm64, Node v22.16.0, npm 10.9.2. Commands were executed,
not proposed. Source paths in retained output are normalized to `<repo>`; ANSI colors and trailing whitespace are removed.

## Clean install and build

Copied only tracked/candidate repository files into a newly created temporary directory;
no .git, node_modules, dist/lib, .env, local SQLite, or original root export was copied.
Ran the following from that directory; every command exited 0:

```sh
npm ci --fetch-retries=1 --fetch-timeout=30000
npm run verify:data
npm run typecheck
npm run build
npm run check:react
npm test
```

| Command | Observed result | Transcript |
| --- | --- | --- |
| npm ci | 1424 packages installed; lockfile accepted; native module loads | [install](clean-install.log.txt) |
| verify:data | SHA256 match; Application 788, Delegated 876, RSC 60; disabled 2/2/0 | [data](clean-data.log.txt) |
| typecheck | Shared packages, all three applications and typed fixture pass | [types](clean-typecheck.log.txt) |
| build | Shared/API/Vite compile; SPFx production Heft/Webpack/lint/package pass | [build](clean-build.log.txt) |
| check:react | Host/UI resolve React 18.3.1; SPFx manifest externals correct; no shared SPFx identity dependency | [boundaries](clean-boundaries.log.txt) |
| npm test | 6 tests pass, 0 failures | [tests](clean-tests.log.txt) |

SPFx package is generated at apps/spfx/sharepoint/solution/graph-permissions-explorer.sppkg
(ignored output, reproducible with the build command). [Built manifest](spfx-built-manifest.json)
is retained as evidence of host React and Microsoft package externalization.
The rig runs 0 SPFx-specific Jest tests; do not confuse that with the 6 root tests.

## Browser execution

From the implementation workspace, after the final source fixes and build:

```sh
npx playwright install chromium
npm run test:browser
```

Chromium 141.0.7390.37 / Playwright 1.56.1, 2 tests passed. The fixture error is
injected only by browser-test routing; the normal connection uses the real local Nest
service and :memory: SQLite. No page JavaScript exceptions; a 360px viewport has no
horizontal overflow. API failure remains an error and Retry recovers to not-imported.
[Test output](browser.log.txt), [narrow screenshot](vite-foundation-narrow.png).

## Data preservation and review

`shasum -a 256 commercial-graph-permlist.json data/commercial-graph-permlist.json`
confirmed original `1e9fddd84ef533e9cd9e8a97fd9d2cd304620c8686305f2b2418d6dad9e55bf1`
and safe `d566bed3c4d7a4cf09ec54d35c25aee7b232df5b46c765af7a377dd9fe0b96a0`.
All three permission arrays were deep-compared to the original and are equal.
Only the sanitized snapshot is staged; the user's original remains local and ignored.

Independent bounded review found missing resource-list query validation and malformed
HTTP JSON error handling. Both are corrected, covered by the 6-test regression run
and re-reviewed. This is implementation review, not an exhaustive security assessment.

## Limits

No SharePoint deployment or real page runtime, HTTPS API integration, dev certificate
trust/start workflow, other OS/architecture, hosted CI, complete catalog import,
classification or full UI acceptance is claimed. These stage 1 commands do not verify
stage 2/3 behavior. No merge, issue closure, Azure or production deployment occurred.
