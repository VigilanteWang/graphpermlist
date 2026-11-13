# Read-only API v1 contract

Stage 1 fixes this wire contract for #4/#5. Types: packages/contracts/src/index.ts.
The stage 1 server exposes an empty, **not imported** state. No catalog fixtures are
served. Data import, filtering, grouping and detail queries are implemented in #4.

## Routes

Base URL includes `/api/v1`. `resourceId` is the resource **App ID**, not the export's
service principal Object ID. A malformed UUID returns 400; unknown/unimported resource 404.
The path permission value is case-sensitive and URL encoded as one path segment.

| GET path | Response type | Stage 1 behavior |
| --- | --- | --- |
| `/resources` | ResourcesResponse | 200, items=[], dataState=not-imported, source=null |
| `/resources/{resourceId}/categories` | CategoriesResponse | Validated query then 404 (no imported resource) |
| `/resources/{resourceId}/permissions` | PermissionsResponse | Validated query then 404 |
| `/resources/{resourceId}/permissions/{permissionValue}` | PermissionDetailResponse | Validated query then 404 |

`GET /health` under the same prefix is an additional startup probe, not a fifth catalog API.
No credential is sent by the shared client; browser CORS origins are explicitly configured.

## Query parameters

The categories, permission list and detail routes accept the same flat query object.
Unknown/repeated query parameters and invalid values return 400 (no implicit Boolean conversion).
The resource list has no query parameters. No pagination in V1.

| Parameter | Values/default | Meaning |
| --- | --- | --- |
| `q` | string, max 500, default empty | Trim and search case-insensitively in value, GUID, official titles/admin and user consent text |
| `category` | stable category slug, max 100 | Exact main category; unknown slug has no matches |
| `family` | exact family key, max 100 | Full prefix before first dot; OIDC uses `OpenID permissions` |
| `permissionType` | `Delegated` or `Application` | Exact type, case-sensitive |
| `adminConsentRequired` | literal `true` or `false`; default unspecified | Type-specific consent rule |
| `showDisabled` | literal `true` or `false`; default false | Include disabled definitions; not a disabled-only filter |

For each row, first select definitions satisfying **all definition-specific filters on
the same definition** (type, admin consent, enabled state and definition text/ID search).
A name match may match each definition of that name. Then merge surviving definitions by
resource App ID + permission value; discard empty rows. Never join a Delegated consent
condition with an Application type condition. Category/family apply to the merged name.
Search never changes persistent classification or invokes AI.

`visibleTypes` and row `definitions` reflect only surviving definitions. Details include
an `item` with the same visible subset plus `allDefinitions` including disabled and
nonmatching types. Detail with no surviving definition returns 404. UI uses allDefinitions
for complete GUIDs, official text and status, without adding hidden labels to the list.

## Fields and counts

Application title/description use displayName/description, adminConsentRequired=true
is explicitly tagged `application-always-required`. Delegated uses adminConsentDisplayName/
adminConsentDescription and type Admin/User => true/false, tagged `delegated-consent-type`;
user consent labels are separately retained. Tenant policy may further restrict user consent.
RSC is excluded, never mapped into ordinary Application.

Every successful response carries `dataState` and `source`. `not-imported` means no
successful import and source=null. `ready` means an active import exists even if filtering
returns zero rows. `source` contains safe source filename (no absolute path), SHA256,
ISO 8601 UTC import time, classification version and excluded RSC count.

`permissionCount` counts merged names; `definitionCount` counts matching definitions.
Resource counts use default filters. Categories/list aggregate and category item counts
use the exact current filter; empty categories are omitted. Details retain all type status
separately. Counts are never inferred by adding label counts or hardcoded snapshot totals.

Examples (illustrative, not live catalog responses):

```json
{"dataState":"not-imported","source":null,"items":[]}
```

A ready empty permission search returns 200 with `items:[]`, both counts zero and the
active source metadata. Unknown resource/value (or a value hidden by current filters)
returns 404. See tests/fixtures/catalog.ts for an explicitly synthetic dual-type Mail.Read
row and detail shape. Fixture IDs/text are not claimed to be the official snapshot.

## Errors

Use Nest's default error JSON, not a custom success/error envelope:

```json
{"statusCode":400,"message":["showDisabled must be a boolean value"],"error":"Bad Request"}
```

404 has a string `message` and `error: Not Found`. Unexpected service failures return 500
with `message: Internal server error`; never send database paths, SQL or stack traces.
The shared client preserves HTTP status, normalizes text failures and distinguishes HTTP
errors from network failures. UI displays loading, not-imported, no-results (#5) and API
error states separately. API errors are not transformed into an empty imported catalog.
