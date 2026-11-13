# Project instructions

Read the latest parent issue #2 and current stage issue, then docs/implementation-plan.md.
Work one stage at a time. Use an independent stage branch/PR based on updated main.
Do not merge, close issues, deploy, or start the next stage without authorization.

V1 is a global-cloud, English, read-only local permissions catalog. No login,
live Graph collection, tenant grants, RSC UI, Azure infrastructure or production deployment.
Keep Nest's default Express adapter, TypeORM/better-sqlite3 and synchronize:false.
UI uses Fluent UI v9 and React 18.3.1 peers; host adapters own React roots and configuration.
Shared packages must not import SPFx context or identity clients. Scope styles locally.
Data lives in data/commercial-graph-permlist.json or PERMISSIONS_SOURCE. Never invent
missing input, import fixtures as production data, or commit credentials/local databases.
Code, documentation, fixtures and retained logs must not contain personal data, tenant
identifiers, credentials or personal absolute paths. Public resource/permission IDs are valid.

Use Node from .nvmrc and npm 10.9.2. Run from the repository root:
- npm ci
- npm run db:migrate / npm run import:data
- npm run verify:data
- npm run typecheck
- npm test
- npm run build
- npm run test:browser (requires Playwright Chromium)
- npm run start:api / npm run dev:web (separate terminals)

The main agent owns manifests, lockfile, contracts, integration and Git operations.
Delegate bounded independent files only when useful; no shared-file concurrent writes
or branch switching by subagents. Model availability depends on the current environment;
use GPT-6.1 Sol / high for the main conversation and GPT-6.1 Sol / low or medium
for execution subagents where supported. Verify overrides or report limitations; do not
change global agent settings.
Update the plan with actual commands, results, limitations and handoff before stopping.
SPFx package build success is not proof of runtime acceptance in SharePoint.
