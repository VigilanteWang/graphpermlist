# Microsoft Graph permission input

`commercial-graph-permlist.json` is the complete sanitized permission snapshot
used by the repository. It is a commercial-cloud Microsoft Graph resource
service-principal export, not evidence that every permission is available in
other clouds or that a tenant has granted any of these permissions.

## Snapshot integrity and meaning

| Collection | Total | Disabled (`isEnabled: false`) | Meaning |
| --- | ---: | ---: | --- |
| `appRoles` | 788 | 2 | Ordinary application permissions; all 788 entries include `Application` in `allowedMemberTypes` |
| `oauth2PermissionScopes` | 876 | 2 | Delegated permission scopes |
| `resourceSpecificApplicationPermissions` | 60 | 0 | Resource-specific consent (RSC) application permissions, kept separately from ordinary application permissions |

All 1,724 records are retained, including the four disabled records. Permission
IDs, values, descriptions, consent labels, member types, origins, types, and
enabled states are unchanged. Permission IDs and values are unique **within each
collection**; ordinary and RSC application permissions remain separate sets.
Resource App ID `00000003-0000-0000-c000-000000000000` identifies Microsoft Graph.
It is not a tenant-specific service-principal Object ID.

SHA256 digests of the exact UTF-8 files:

- Original root `commercial-graph-permlist.json` (local, untracked, untouched):
  `1e9fddd84ef533e9cd9e8a97fd9d2cd304620c8686305f2b2418d6dad9e55bf1`
- Versioned `data/commercial-graph-permlist.json`:
  `d566bed3c4d7a4cf09ec54d35c25aee7b232df5b46c765af7a377dd9fe0b96a0`

The pinned safe digest is also the manifest constant `SNAPSHOT_SHA256` in
`scripts/verify-data.mjs`. It detects record removal, altered fields, and other
changes without imposing today's counts on future reviewed snapshots.

## Sanitization and reproducibility

Use a root-field allowlist: retain only `appId`, `appDisplayName`, `displayName`,
`appRoles`, `oauth2PermissionScopes`, and
`resourceSpecificApplicationPermissions`, in that order. Preserve every item,
all official fields in each of the three collections, and array order. Serialize
as UTF-8 JSON with two-space indentation, unescaped Unicode, and a final newline.
The following Python 3 command reproduces this snapshot from the original
local file when run at the repository root:

```sh
python3 - <<'PY'
import json
from pathlib import Path
source = json.loads(Path('commercial-graph-permlist.json').read_text(encoding='utf-8'))
keys = ['appId', 'appDisplayName', 'displayName', 'appRoles',
        'oauth2PermissionScopes', 'resourceSpecificApplicationPermissions']
safe = {key: source[key] for key in keys}
Path('data/commercial-graph-permlist.json').write_text(
    json.dumps(safe, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
PY
```

Everything else at the root is removed: `@odata.context`, `id`,
`deletedDateTime`, `accountEnabled`, `alternativeNames`, `appDescription`,
`applicationTemplateId`, `appOwnerOrganizationId`, `appRoleAssignmentRequired`,
`createdByAppId`, `createdDateTime`, `description`, `disabledByMicrosoftStatus`,
`homepage`, `isDisabled`, `loginUrl`, `logoutUrl`, `notes`,
`notificationEmailAddresses`, `preferredSingleSignOnMode`,
`preferredTokenSigningKeyThumbprint`, `replyUrls`, `servicePrincipalNames`,
`servicePrincipalType`, `signInAudience`, `tags`, `tokenEncryptionKeyId`,
`samlSingleSignOnSettings`, `addIns`, `info`, `keyCredentials`,
`passwordCredentials`, and `verifiedPublisher`.

This removes the tenant-specific service-principal Object ID, source organization
and creation metadata, credentials/signing metadata, and unrelated service
configuration. The original credential arrays were empty. The output has no
credentials, tenant identity fields, or personal filesystem paths. Only the
resource App ID and permission definition IDs remain.

## Validation and replacement inputs

Run from the repository root with Node.js:

```sh
node scripts/verify-data.mjs
PERMISSIONS_SOURCE=data/commercial-graph-permlist.json node scripts/verify-data.mjs
```

The default resolves relative to the script, independent of the working
directory. An explicit `PERMISSIONS_SOURCE` resolves relative to the caller's
working directory (absolute paths also work). Missing files fail explicitly;
there is no fallback to the original root export, network, or an empty dataset.
The validator rejects missing/empty collections, malformed records, unsupported
metadata, and duplicate IDs or values within a collection. It keeps disabled
records and reports their counts.

For a new sanitized input, use `PERMISSIONS_SOURCE` and optionally
`PERMISSIONS_SHA256` to pin its exact expected bytes. The checked-in default is
always pinned unless an explicit replacement digest is supplied. A custom file
without an expected digest receives structural validation only: no validator
can infer whether a nonempty external export omitted records. Pin a known-good
digest when external input completeness must be guaranteed. Future reviewed
snapshots may have different counts; update this document and the manifest when
intentionally replacing the versioned snapshot.
