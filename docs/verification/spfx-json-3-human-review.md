# #18 human review

Use Node 22.16.0 and npm 10.9.2 from the root of the #18 PR checkout. Install
Playwright Chromium with `npx playwright install chromium` when needed. The
checks below use a new directory and reserved loopback ports.

```sh
npm ci
PERMISSIONS_SOURCE= PERMISSIONS_CONFIG= PERMISSIONS_SHA256= npm run verify:data
npm run typecheck
npm test
npm run build
npm run check:react

catalog_review_dir=$(mktemp -d)
export SQLITE_PATH="$catalog_review_dir/catalog.sqlite"
export PERMISSIONS_SOURCE= PERMISSIONS_CONFIG= PERMISSIONS_SHA256=
npm run db:migrate
npm run import:data
npm run import:data
npm run export:json -- --output "$catalog_review_dir/catalog" --generated-at 2026-11-20T00:00:00.000Z
npm run verify:json -- --output "$catalog_review_dir/catalog"
SQLITE_PATH="$catalog_review_dir/graph.sqlite" npm run db:migrate
SQLITE_PATH="$catalog_review_dir/graph.sqlite" PERMISSIONS_SOURCE=./data/commercial-graph-permlist.json npm run import:data
```

1. Review the three original implementation commits in order. The package move leaves
   the existing bundles and source semantics intact. The reader uses one
   version ID for categories, families and definitions. The feature commit
   adds the default resources, migration, schema 2 and shared navigation. Then
   review the ETL follow-up. Extract, transform and export live under
   `catalog/etl/src`, the SQLite writer is under `apps/api/src/catalog/load`,
   and `catalog/json-format` still exposes `@graph/catalog-json/validation`.
   The current validator accepts schema 2 for both manifest and snapshot.
2. Check that the first default import saves 1,917 ordinary definitions and
   the repeat reports the same three version IDs with `reused: true`. The separate
   explicit Graph import saves 1,664 ordinary definitions and returns one version.
   The default schema 2 artifact verifies with SHA-256
   `f03b0daffb23e8dccaf55c2fc6158fafb2905c0961d3cdde8af325efa9cf2f47`.
3. Run the API against the scratch SQLite file with
   `PORT=3228 CORS_ORIGINS=http://127.0.0.1:5328 npm run start:api`. In
   another terminal run
   `VITE_API_BASE_URL=http://127.0.0.1:3228/api/v1 npm run dev:web -- --port 5328 --strictPort`.
   Open `http://127.0.0.1:5328` and check the following.

   | Resource | Browse path | Visible definitions | Permission rows | RSC excluded |
   | --- | --- | ---: | ---: | ---: |
   | Microsoft Graph | Category, then family | 1,660 | 1,034 | 60 |
   | Power BI Service | Family | 204 | 202 | 0 |
   | SharePoint Online | Family | 49 | 34 | 0 |

   On Home, expand each resource's data details and compare its file name
   and SHA-256 with [the manifest](../../data/catalog-resources.json).
   Verify Power BI `Tenant.Read.All` shows Application and Delegated in
   one row. Verify Graph and SharePoint `Sites.Read.All` have their own
   definition GUIDs and consent text. With global filters selected, switch
   resources and confirm global filters survive while the previous family,
   category and detail close. Use the keyboard to enter a Graph category
   and return to its card, and close a detail to return focus to its trigger.
   Stop both scratch services when finished.
4. Run `node --test tests/multi-resource.test.mjs tests/json-parity.test.mjs tests/json-client.test.mjs`.
   Expect all tests to pass, including invalid App ID/digest rollback,
   SQLite write failure in a mixed batch, fixed-time publication, schema
   validation and per-resource source/definition parity. The client refreshes
   from two schema 2 versions, then loads the previous verified manifest and
   restores that version's category and details. Graph-only JSON publishes
   through a single-entry manifest. The old export input fails with a manifest
   migration message, and schema 1 manifests and snapshots return
   `unsupported-schema`.
5. Run both Chromium checks. The test-only generator writes two fake
   definitions and registers them in a copy of the real manifest.

   ```sh
   CATALOG_TEST_API_PORT=3229 CATALOG_TEST_WEB_PORT=5329 npm run test:browser
   catalog_fourth_dir=$(mktemp -d)
   node tests/fixtures/add-verification-resource.mjs "$catalog_fourth_dir"
   CATALOG_TEST_RESOURCE_CONFIG="$catalog_fourth_dir/catalog-resources.json" \
     CATALOG_TEST_API_PORT=3229 CATALOG_TEST_WEB_PORT=5329 \
     npm run test:browser -- tests/browser/multi-resource.spec.ts
   ```

   Expect the default suite to pass with the synthetic-only case skipped,
   and all four targeted cases to pass with the extra manifest. A negative
   test injects the invalid input only in scratch storage.
6. Check that the production build still emits the existing API SPFx package
   and that React and compiled dependency checks pass. The website and SPFx
   retain API clients in this stage. Two-mode host initialization and
   SharePoint transport are #14. Actual tenant runtime, permissions and rollback
   to the previous verified schema 2 release are #15.

Record `pass`, `change-needed` or `blocked` on [#18](https://github.com/VigilanteWang/graphpermlist/issues/18)
with the step, expected/observed result and sanitized evidence.
