# #12 human review

Parent [#11](https://github.com/VigilanteWang/graphpermlist/issues/11), stage
[#12](https://github.com/VigilanteWang/graphpermlist/issues/12).
Review this stage PR and [decisions/evidence](../sharepoint-json-plan.md).
Use pass / change-needed / blocked for each item, with command, expected/actual
result and sanitized evidence. Do not include local paths, credentials or tenant IDs.

1. **Prerequisites and setup.** Check out this PR's stage branch, use .nvmrc Node
   22.16.0 and npm 10.9.2, and confirm the tracked safe data file exists (or provide
   PERMISSIONS_SOURCE without committing its path). Run npm ci, npm run verify:data,
   npm run typecheck, npm test, npm run build and npm run check:react from root.
   Expect successful commands, 26 Node tests, Vite production output and existing
   API SPFx .sppkg. Package/build output is not SharePoint runtime acceptance.
2. **Real process and isolated database.** Reserve local port 3218; run
   `node docs/verification/spfx-json-1/runtime-check.mjs` from root. Expect migrate,
   import and reused import to pass; a new CommonJS HTTP process serves health and
   four routes with 1,660 enabled / 1,664 all / 1,036 merged names / RSC 60 excluded,
   proper source keys, Mail.Read dual types, User.Read Delegated, GUID filtering,
   same-definition consent, validation/404/CORS. The script uses/removes its own
   temporary database and process; it does not import into the reviewer's SQLite.
   It fails if another HTTP service already answers on port 3218.
3. **Browser reproduction.** Install Chromium with `npx playwright install chromium`
   if needed. Reserve 3216/5316, then run
   `CATALOG_TEST_API_PORT=3216 CATALOG_TEST_WEB_PORT=5316 npm run test:browser`.
   Expect 26/26, including compiled core ESM executing in Chromium without process
   or require, source generatedAt without invented importedAt, and all prior UI
   interaction/error/keyboard/layout/stale-response cases. The isolated test API
   imports real safe data into memory; response interception is only test-specific
   state/metadata/error simulation, not a production JSON client.
4. **Inspect boundaries and contracts.** Read packages/contracts/src/index.ts and the plan's
   schema 1 decisions. Confirm source.sha256 vs manifest.artifactSha256, generatedAt
   vs database importedAt, raw official fields and classification references. Check
   that schema validation/load/refresh/publication are explicitly #13 work. Review
   catalog-core source and both outputs: no IO/Nest/TypeORM/Node/identity dependency;
   CatalogService owns repositories/404s. UI imports CatalogClient from contracts;
   the old api-client type export still works. Existing host IDs/properties/config
   and HTTP wire values remain compatible. npm lock adds only a local workspace.
5. **Interactive API UI check (optional complement).** To use a persistent isolated
   review database, build first, then run `SQLITE_PATH=./var/json1-review.sqlite npm run db:migrate`
   and `SQLITE_PATH=./var/json1-review.sqlite npm run import:data`. In one terminal run
   `PORT=3219 CORS_ORIGINS=http://localhost:5319 SQLITE_PATH=./var/json1-review.sqlite npm run start:api`;
   in another run `VITE_API_BASE_URL=http://localhost:3219/api/v1 npm run dev:web -- --port 5319 --strictPort`.
   Open http://localhost:5319. Expand Catalog data details: expect real Imported at
   (UTC), Source SHA-256 and classification version. Browse Graph -> Exchange ->
   Mail.Read; change type/consent/search/disabled, inspect full GUIDs and both
   definitions, return with criteria preserved. Check narrow/keyboard/theme/error
   retry behavior against existing evidence. Stop only these terminals afterward.
6. **Chinese comment review.** Changed program sources have Chinese file headers
   and purpose-first TSDoc/JSDoc on declarations, including methods. Inspect the
   same-definition filter, stable same-type order, provider adapter and dependency
   boundaries for accurate short comments. English product/error/official permission
   wording and domain terms remain English. AST coverage was 8 modules / 78 named
   declarations; config/tests/fixtures/generated/static files are excluded by purpose.
7. **Unverified and stop boundary.** No authorized SharePoint environment is supplied.
   Actual API SPFx page/theme/lifecycle/style/narrow-host acceptance remains pending,
   as in #2/#6. No JSON exporter/client, second Web Part, JSON .sppkg, tenant file
   access, dual-Web-Part co-residency or publication/rollback runtime is delivered
   by #12. #13 owns export/client; #14 owns second package and three-entry integration;
   #15 owns final independent/runtime acceptance. No CDN/Lists/Azure/deployment.
   Review/merge decision belongs to the user. After merge, verify updated main and
   start #13 in a new chat. Do not merge, close issues or begin #13 automatically.
