# Commercial-cloud permission inputs

The default [resource manifest](catalog-resources.json) pins the exact bytes of
three sanitized exports. Resource App IDs identify the public APIs. Official
permission labels and definitions are preserved, including disabled entries.

| Resource | Application | Delegated | Disabled ordinary definitions | RSC excluded from catalog |
| --- | ---: | ---: | ---: | ---: |
| Microsoft Graph | 788 | 876 | 4 | 60 |
| Power BI Service | 2 | 202 | 0 | 0 |
| SharePoint Online | 20 | 29 | 0 | 0 |

SharePoint has the public display name `Office 365 SharePoint Online` in the
source. The manifest sets its catalog label to `SharePoint Online`. The Graph
file has the same SHA-256 and bytes as the earlier single-resource snapshot.

## Sanitize a reviewed export

Use Node and the repository lockfile. Store the original in an ignored directory
such as `release/raw`, and choose a fresh output file.

```sh
npm run sanitize:data -- --input ./release/raw/export.json \
  --output ./release/sanitized.json --app-id 00000003-0000-0000-c000-000000000000
shasum -a 256 ./release/sanitized.json
```

The command preserves `appId`, `appDisplayName`, `displayName` and the three
permission collections. It projects each record onto the public fields listed
below, validates the result against the expected App ID, and creates a new file.
The original export and any existing output are preserved.

- `appRoles` retains `id`, `value`, `isEnabled`, `allowedMemberTypes`, `origin`,
  `displayName` and `description`.
- `oauth2PermissionScopes` retains `id`, `value`, `isEnabled`, `type` and the
  `adminConsent` and `userConsent` display names and descriptions.
- `resourceSpecificApplicationPermissions` retains `id`, `value`, `isEnabled`,
  `displayName` and `description`.

Verify provenance before publishing any export. A field allowlist removes
unrelated Service Principal properties such as instance and organization IDs,
credential fields, and service configuration. Public-looking fields can still
contain tenant-authored permission names or text. Review their contents as well.

The first Power BI and SharePoint versions tracked in the repository included
Service Principal wrapper fields. The current sources use the whitelist.
Earlier Git commits retain their original contents.

## Register another reviewed resource

1. Put the sanitized file next to the manifest. Add its public App ID, JSON
   basename and SHA-256 to the manifest. Its display label defaults to the
   export's `displayName`, with an optional manifest override.
2. Omit `classification` to browse directly by the permission value's first
   segment. For a custom category view, supply a version and exact family map.
   Unmapped families appear under **Uncategorized**.

   ```json
   {
     "mode": "categories",
     "version": "v1",
     "categories": [
       { "category": "reports", "displayName": "Reports", "description": "Reporting permissions", "families": ["Report"] }
     ]
   }
   ```

3. Run `npm run verify:data`, migrate/import to SQLite, or export and verify a
   JSON release. Custom manifests use `PERMISSIONS_CONFIG` with the file path
   relative to the command's working directory or an absolute path. The manifest
   resolves its source basenames relative to its own directory.

Provide all three permission arrays. Application and Delegated may each be
empty as long as at least one ordinary definition is present. RSC may be empty.
The verifier rejects extra fields, malformed records, App ID or digest mismatch,
and duplicate IDs within a collection. Different GUIDs may share a value and
are preserved as separate definitions in the same display row. Offline publication
also applies the serialized size and collection limits used by the browser.
Run `verify:json` to validate a candidate release against those limits.
See [publication limits](../docs/catalog-operations.md#offline-json-publication).

An explicit `PERMISSIONS_SOURCE` selects Graph-only input for SQLite import and
`verify:data`. Pin a custom Graph file with `PERMISSIONS_SHA256`. JSON export uses
schema 2 and a resource manifest. For a Graph-only publication, copy the Graph
entry from [the default manifest](catalog-resources.json) into a one-entry manifest
beside the source file and set `PERMISSIONS_CONFIG` to that manifest. See
[catalog operations](../docs/catalog-operations.md#offline-json-publication).
