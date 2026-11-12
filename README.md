# Microsoft Graph Permissions Explorer

Stage 1 foundation for [#2](https://github.com/VigilanteWang/graphpermlist/issues/2)
and [#3](https://github.com/VigilanteWang/graphpermlist/issues/3): a read-only Nest API,
shared Fluent UI v9 shell, Vite standalone host and SPFx 1.24.1 Web Part.
The catalog is **not imported yet**. Full import/API/UI behavior belongs to stages 2/3.
No login, live Graph requests, grants, RSC display or deployment is included.

## Prerequisites and installation

Use Node **22.16.0**, npm **10.9.2** (.nvmrc/.node-version). No global CLI is needed.
macOS arm64 is verified. Native better-sqlite3 may need Python 3 and C/C++ build tools
if a prebuilt binary cannot be downloaded on your platform; other OS/architectures
have not been exercised here. No database server or Docker is required.

From the repository root:

```sh
npm ci
npm run verify:data
npm run typecheck
npm test
npm run build
npm run check:react
```

The root npm workspaces lockfile pins all dependencies. SPFx keeps its own official
Heft/Webpack rig, while the standalone host uses Vite. Shared packages compile first.
Heft uses its documented `--unmanaged` option because its version-selector assumes a
project-local node_modules folder; npm resolves the pinned 1.3.2 binary from the root.
No global Heft or symlink setup is needed.

## Run locally

In terminal 1, from the root (build first after source changes):

```sh
npm run build:shared
npm run build:api
npm run start:api
```

In terminal 2, from the root:

```sh
npm run dev:web
```

Open [the Vite host](http://localhost:5173). It loads the exact ExplorerShell exported
by packages/ui, calls the real local API and displays “No catalog imported yet.”
The default API listens at 127.0.0.1:3000. Probe [health](http://localhost:3000/api/v1/health)
and [resources](http://localhost:3000/api/v1/resources). Ctrl+C stops each process.
`npm run build:web` produces static output under apps/web/dist; it still needs the API.

Optional API settings: copy .env.example to .env or set environment variables.
ConfigModule reads .env when the root start command runs:

| Setting | Default | Meaning |
| --- | --- | --- |
| PORT / HOST | 3000 / 127.0.0.1 | Local listener |
| CORS_ORIGINS | http://localhost:5173 | Comma-separated exact HTTP(S) origins, no trailing slash; use http://127.0.0.1:5173 if browsing by IP |
| SQLITE_PATH | ./var/catalog.sqlite | Relative to process working directory, or :memory: for isolated tests |
| PERMISSIONS_SOURCE | data/commercial-graph-permlist.json | Validated by verify:data now; import uses it in stage 2 |

For the web host, copy apps/web/.env.example to apps/web/.env.local and set
VITE_API_BASE_URL (including /api/v1). Restart Vite after changing it; production
values are build-time settings. The shared component never reads environment variables.
The SQLite file/directory is created on connection; no catalog tables are created in
this stage. synchronize:false and migrationsRun:false are explicit. **No migration or
import command is claimed yet**; implement versioned migrations and the Nest application-
context import CLI in #4 before loading data. Browser code never opens SQLite.

## SPFx build and future runtime verification

```sh
npm run build:shared
npm run build:spfx
```

Output: apps/spfx/sharepoint/solution/graph-permissions-explorer.sppkg.
This is a production build/package only; it does not upload or deploy anything.
SPFx source and compiled manifest externalize React and react-dom/client as 18.3.1.
Published SPFx internal packages still install isolated React 17.0.1 dependencies;
they are host externals, not bundled into the shared UI/Vite or this Web Part.
`npm run check:react` verifies both host/UI resolutions, expected isolated copies,
compiled host externals and shared-package boundaries. Do not claim every installed
transitive package uses React 18 or infer runtime acceptance from the manifest alone.

The Web Part's **API base URL** property configures the client. The local default is
http://localhost:3000/api/v1; an HTTPS SharePoint page will need a reachable HTTPS API
and an allowed CORS origin. No test tenant/HTTPS endpoint/deployment is provisioned.
`npm run dev:spfx` starts the official Heft development workflow, which additionally
requires its development certificate and a test-tenant workbench URL in serve.json.
Do not run trust/deploy steps without appropriate local/test authorization.
The dev workflow itself and real SharePoint package loading are not verified here.
Real tenant tests (including styles, narrow containers and lifecycle disposal) remain
for #5/#6 after the user authorizes test deployment.

## Browser smoke tests

```sh
npx playwright install chromium
npm run test:browser
```

Tests start/stop isolated local API (:memory: SQLite) and Vite servers. Ports 3000
and 5173 must be free. Chromium checks the real connection, narrow 360px layout,
JavaScript errors and an injected API failure followed by recovery. Generated screenshots
are under test-results/ (ignored). This does not simulate SharePoint acceptance.

## Data and handoff

The sanitized versioned source is data/commercial-graph-permlist.json; see
[data provenance](data/README.md). No personal absolute path is required. Missing or
invalid input fails explicitly; there is no synthetic fallback. Test-only contract
examples are under tests/fixtures and are never served/imported as catalog data.

See [wire contract](docs/api-contract.md), [stage plan/evidence](docs/implementation-plan.md)
and [repository instructions](AGENTS.md). The next stage starts only after this stage's
independent PR is reviewed, merged by the user and its main result verified.
