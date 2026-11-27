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
PERMISSIONS_SOURCE=./data/commercial-graph-permlist.json npm run export:json -- \
  --output "$catalog_review_dir/legacy" --generated-at 2026-11-20T00:00:00.000Z
npm run verify:json -- --output "$catalog_review_dir/legacy"
```

1. Review the three implementation commits in order. The package move leaves
   the existing bundles and source semantics intact. The reader uses one
   version ID for categories, families and definitions. The feature commit
   adds the default resources, migration, schema 2 and shared navigation.
2. Check that the first default import saves 1,917 ordinary definitions and
   the repeat reports the same three version IDs with `reused: true`. The two
   releases verify with schema 2 and schema 1 respectively. The schema 1
   artifact has SHA-256
   `c36f834e8c98d9cd14eda29878c2ab9f646fa161284dc7a99ae569c37294d409`.
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
4. Run `node --test tests/multi-resource.test.mjs tests/json-parity.test.mjs`.
   Expect all tests to pass, including invalid App ID/digest rollback,
   SQLite write failure in a mixed batch, fixed-time publication, schema
   validation, schema 1 rollback and per-resource source/definition parity.
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
   SharePoint transport are #14, with actual tenant runtime, permissions
   and upload/rollback acceptance in #15.

Record `pass`, `change-needed` or `blocked` on [#18](https://github.com/VigilanteWang/graphpermlist/issues/18)
with the step, expected/observed result and sanitized evidence.
