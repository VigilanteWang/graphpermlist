# Stage #6 human-review checklist

Read [parent #2](https://github.com/VigilanteWang/graphpermlist/issues/2),
[stage #5 updates](https://github.com/VigilanteWang/graphpermlist/issues/5),
[stage #6](https://github.com/VigilanteWang/graphpermlist/issues/6),
[acceptance/evidence](phase-4.md), README and the stage #6 PR linked in the plan.
Record **pass / change needed / blocked** and sanitized reproducible evidence.
Do not publish tenant IDs, local paths, credentials or grants.

- [ ] **Review fixes and retained behavior.** Inspect the focus fallback in
  `packages/ui/src/index.tsx`, its two browser regressions and data/README GUID wording.
  Confirm no dependency/data/API/classification changes. Both levels keep current
  criteria; the toolbar and Home/sidebar changes from #5 remain intact.
- [ ] **Fresh local setup.** Use Node `.nvmrc`/npm 10.9.2. Run `npm ci`,
  `npm run verify:data`, `npm run build:shared`, `npm run build:api`. Set
  `SQLITE_PATH=./var/review.sqlite` in the CLI/API terminals; run `npm run db:migrate`
  and two `npm run import:data` calls. Expect 1,664 definitions and second-call reuse.
  This is the reviewer's disposable file; automated tests use separate SQLite files
  or memory and do not replace it. Start `npm run start:api` / `npm run dev:web`
  separately; ensure matching API URL/CORS and the same SQLite path.
- [ ] **Read all #2 mapping rows.** Verify Home 1,660 enabled / 1,664 ordinary /
  60 excluded RSC. Expand Catalog data details for source SHA/import time/classification.
  Check Graph service cards and default/Show disabled counts, Uncategorized retention,
  User.Read Delegated only, Mail.Read two full official definitions and different consent.
  Search a GUID, test Application + Not required empty and all type/family/admin filters.
  Compare list/card counts to the same API query, test clipboard and denied clipboard.
  Expected outcomes are in the complete mapping; do not mark SharePoint rows passed.
- [ ] **Keyboard return fix.** Enter Exchange, search User.Read GUID
  `e1fe6dd8-ba31-4d61-89e7-88639da4683d`, focus Back and press Enter. Expect global
  User.Read results, retained query and focus on the Microsoft Graph heading because
  Exchange is absent. Shift+Tab should reach Clear search. Repeat with an unmatched
  string (zero global results). With a query that keeps Exchange, return still focuses
  its card. Clearing search restores ordinary expansion; revisiting Exchange after
  global Delegated/EWS selection must retain current criteria.
- [ ] **Full local regression.** Run `npm run typecheck`, `npm test`, `npm run build`,
  `npm run check:react`. Install Chromium using `npx playwright install chromium` if
  needed, then `CATALOG_TEST_API_PORT=3216 CATALOG_TEST_WEB_PORT=5316 npm run test:browser`
  with those ports free. Expect 14 Node tests and 24 Chromium tests; actual .sppkg
  generated. Check 320/360px, long details, local table scroll, visible focus, modal
  keyboard, search expansion/restoration, reduced motion and sibling-style isolation.
  Stop/restart only your own API and Retry; errors must remain distinct from empty data.
- [ ] **SharePoint environment — pending, requires explicit authorization.** The
  minimum prerequisite is an accessible test SharePoint page, permission to upload/
  install this package, and a browser-trusted reachable HTTPS API with exact page
  origin in CORS. No such deployment is authorized by this handoff. After authorization,
  follow [HTTPS setup](../ui-development.md), load the package on an actual page,
  configure its API base URL and point Vite to the same snapshot/API. Check TLS and
  actual GET/OPTIONS in DevTools, without bypassing browser security.
- [ ] **Actual cross-host comparison — pending.** In Vite and SharePoint, compare
  source SHA/classification version, Home counts, service counts, Mail.Read/User.Read,
  GUID/type/admin/family/disabled queries, rows, full details and copy behavior. Confirm
  equal results. Exercise narrow columns, long text, light/dark theme, neighboring Web
  Parts, property API URL changes, dispose/remount, single React root and request cleanup.
  Record pass/change needed/blocked separately. Embedded Vite tests and build output
  cannot complete this item; Heft currently has zero Web Part-specific Jest suites.
- [ ] **User release decision.** Review the stage PR and remaining runtime/browser/
  platform limitations. Decide separately on merge, issue closure and any deployment.
  Keep #2 incomplete while real SharePoint acceptance is missing. No next stage,
  Azure/production release or automatic issue closure is included.
