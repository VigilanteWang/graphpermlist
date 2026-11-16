# Shared UI development and host acceptance

The Vite website and SPFx Web Part render the same `ExplorerShell` and use the same
`CatalogClient`. The UI has no SPFx context, identity client, direct SQLite access or
live Graph collection. All labels and permission wording are English.

## Local website

Use the pinned Node/npm versions and run from the repository root:

```sh
npm ci
npm run verify:data
npm run build:shared
npm run build:api
npm run db:migrate
npm run import:data
npm run start:api
```

In a second terminal run `npm run dev:web`, then open `http://localhost:5173`.
The CLI and HTTP server must use the same `SQLITE_PATH`; use an isolated file when
reviewing without changing an existing local database. No startup auto-import occurs.
`PERMISSIONS_SOURCE` can override the versioned `data/commercial-graph-permlist.json`.

Home displays the snapshot name, SHA-256, import time in UTC, classification version,
enabled ordinary definitions, all ordinary definitions and excluded RSC count.
Microsoft Graph shows service cards with merged permission counts and definition counts.
SharePoint / OneDrive is a Graph service category; the separate SharePoint resource and
Power BI navigation entries remain disabled Coming soon items.

Search covers all Graph services on the category page and the selected service on its
family page. The type/admin consent/family/Show disabled controls share the API query.
Search automatically opens matching families; clearing it restores the previous
non-search expansion state. Returning to categories restores that page's query and
focuses the card that opened the service. State persists during component navigation,
not across browser refreshes or host disposal.

Each DataGrid row uses only matching definitions. A GUID search or Delegated filter
can therefore show a single type, while the details panel intentionally displays every
stored definition for that permission. Summary is the official display title, not a
generated summary. Application admin consent is mapped to Yes; Delegated follows
its consent type. Tenant policies may further restrict user consent.

Arrow keys move within the Fluent DataGrid; the permission button opens details.
Escape/Close dismiss the modal and restore its trigger's focus. Copy actions report
success only after Clipboard succeeds; denial provides a selectable manual-copy value.
Wide tables scroll inside their own container; the page adapts to the Web Part's width
using ResizeObserver, even in a wide browser window. Reduced motion disables the
category-body transition. No global element style rules are introduced.

## SPFx configuration and local HTTPS API

`npm run build` produces the Vite bundle and
`apps/spfx/sharepoint/solution/graph-permissions-explorer.sppkg`. It does not deploy.
The Web Part property **API base URL (including /api/v1)** selects the same API used
by Vite. It caches the client until this property changes, reuses one React root,
unmounts on disposal, and maps SharePoint inverted themes to Fluent dark mode.
It does not reproduce the entire SharePoint palette; custom brand/palette contrast
and host theme variants remain part of the actual tenant review.

For a SharePoint HTTPS page, use a browser-trusted HTTPS endpoint. The repository
includes a loopback-only development proxy:

```sh
# In the API terminal, set the exact page origin (no path) before starting Nest.
# Replace this illustrative origin with the authorized test page's origin locally.
CORS_ORIGINS=https://example.sharepoint.com npm run start:api

# In another terminal, use an existing development certificate trusted by your browser.
# TLS_KEY and TLS_CERT identify local files; do not commit private keys or certificates.
LOCAL_HTTPS_KEY="$TLS_KEY" LOCAL_HTTPS_CERT="$TLS_CERT" npm run dev:api:https
```

The proxy listens at `https://localhost:3443`, forwards only `/api/v1/` GET/OPTIONS
to `http://127.0.0.1:3000`, and never forwards Cookie/Authorization headers.
Set the Web Part API URL to `https://localhost:3443/api/v1`. Optional variables:
`LOCAL_HTTPS_PORT` and `LOCAL_API_ORIGIN` (HTTP loopback only). Invalid setup or an
unavailable upstream gives an explicit error. The proxy does not install certificates,
change system trust, bind externally, publish a tunnel or configure SharePoint.

A certificate from an existing local development CA (for example mkcert) must have
localhost in its SAN and be trusted on the **browser's machine**. A self-signed
certificate that a CLI explicitly trusts is not proof of browser trust. Loopback refers
to the reviewing user's computer; other reviewers need their own local API or an
already authorized reachable test HTTPS API. Set Vite's `VITE_API_BASE_URL` to that
same endpoint when comparing hosts; allow both exact frontend origins in CORS.

HTTPS, CORS and API reachability are separate checks. In DevTools inspect the actual
GET and any OPTIONS request: valid TLS, expected response, allowed origin equal to
the page origin and no mixed-content/private-network denial. Local-network browser
permissions or enterprise policy may also require configuration; do not disable
browser security to claim acceptance. Check the real page rather than inferring from
curl, localhost Vite, development workbench or package build results.

## Repeatable verification and tenant boundary

```sh
npm run typecheck
npm test
npm run build
npm run check:react
npm run test:browser
```

Install Playwright Chromium with `npx playwright install chromium` if needed.
Browser tests launch real Nest with an isolated, migrated in-memory SQLite database
and import the real versioned snapshot. They do not touch the reviewer's local database.
Only loading/failure/not-imported tests intercept responses; successful catalog, count,
filter, detail and layout acceptance use real HTTP responses. Browser results are
Chromium evidence, not proof of every configured target browser/version.

Actual SharePoint deployment/runtime needs an accessible test tenant and explicit
permission to upload/install the package or attach development bundles. Neither was
available for this stage. After authorization, follow the
[human-review checklist](verification/phase-3-human-review.md) and record package
load, same-data comparisons, lifecycle, theme/style isolation, keyboard and narrow
Web Part results separately. Do not promote build/packaging evidence to tenant runtime
acceptance. No Azure or production deployment is part of this workflow.

Official lifecycle reference:
[BaseClientSideWebPart](https://learn.microsoft.com/en-us/javascript/api/sp-webpart-base/baseclientsidewebpart?view=sp-typescript-latest).
