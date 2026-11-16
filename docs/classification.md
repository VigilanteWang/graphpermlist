# Permission classification

Version: `2026-11-13.1`, implemented in
`apps/api/src/catalog/classification.ts`. This is a versioned, editorial navigation
map for the local catalog. Categories are not Microsoft permission boundaries and
do not prove that an operation, product license or cloud deployment supports a permission.
The source's official names, identifiers and consent descriptions remain authoritative.

## Deterministic rules

1. Match the exact, case-sensitive OIDC values `openid`, `profile`, `email` and
   `offline_access`. Their category is `openid` and their shared family is
   `OpenID permissions`.
2. Preserve every other permission's complete segment before its first dot as
   `family`, including hyphens. For example, `User-LifeCycleInfo.Read.All` has
   family `User-LifeCycleInfo`, not `User`.
3. Look up an exact permission-value override before the family map. In particular,
   `RoleManagement.Read.Exchange` and `RoleManagement.ReadWrite.Exchange` belong
   to Exchange; their CloudPC counterparts belong to Intune / Windows and their
   Defender counterparts belong to Security / Compliance. `RoleManagement.Read.All`
   spans all RBAC providers and belongs to Microsoft 365 / Platform. Other
   `RoleManagement` names use the Entra family rule. `Group.ManageProtection.All`
   belongs to Security / Compliance because its description concerns MIP labels.
4. Match only the enumerated, case-sensitive first-segment whitelist. No substring,
   partial-prefix, description keyword or runtime AI classification occurs.
5. Return `uncategorized` for every remaining name, retaining its family and data.
   For example, `MailUnknown.Read` and `mail.Read` do not match `Mail`.

An unseen value under a reviewed family inherits that family's category unless an
exact override exists. A new family always requires review. Import records the
classification version; changing rules requires a version change and reimport so
persisted rows and source metadata agree. Classification does not filter disabled
permissions, combine consent types or remove definitions. RSC exclusion belongs to
import validation, before ordinary catalog classification.

## Mapping representation

`FAMILY_GROUPS` stores each category alongside a readonly array of family strings,
for example `['exchange', ['Calendars', 'Contacts', 'Mail']]`. Each family is a
separate quoted entry; whitespace is formatting rather than a delimiter.
`FAMILY_CATEGORIES` flattens these entries into a family-to-category Map for lookup.
There is no runtime whitespace splitting. This representation change preserves all
341 family mappings, exact overrides and classification outputs, so the classification
version remains `2026-11-13.1`.

## Evidence and boundaries

The primary evidence is the real source export's permission values, application
`displayName`/`description` and delegated admin/user consent text. The following
English primary sources corroborate the product relationships, checked on
2026-11-13:

- [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference):
  official permission text, including Copilot names, Agent Registry names, RBAC
  variants and information-protection permissions. Its Application/Delegated
  table columns are permission types, not the editorial categories defined here.
- [Microsoft Graph APIs for mail, calendars and contacts](https://learn.microsoft.com/en-us/exchange/client-developer/exchange-web-services/office-365-rest-apis-for-mail-calendars-and-contacts):
  supports Exchange grouping for mailbox mail, calendars and personal contacts.
  `OrgContact` remains in Entra because it denotes organizational directory contacts.
  `User-Mail` also remains in Entra: its source description concerns secondary
  user mail addresses, rather than mailbox messages.
- [OneDrive file storage API overview](https://learn.microsoft.com/en-us/graph/onedrive-concept-overview)
  and [file storage container permissions](https://learn.microsoft.com/en-us/graph/api/filestoragecontainer-get-permissions?view=graph-rest-1.0):
  support SharePoint / OneDrive and SharePoint Embedded grouping. Selected list
  permissions explicitly name SharePoint Online in the export. A file used by
  Teams still belongs to the files category; product use does not rewrite a permission.
- [Microsoft Teams API overview](https://learn.microsoft.com/en-us/graph/api/resources/teams-api-overview?view=graph-rest-1.0):
  supports chats, channels, app catalog, tabs and Shifts grouping. This does not
  move `Group` or `Files` into Teams merely because Teams uses those APIs.
- [Microsoft Entra Agent ID API overview](https://learn.microsoft.com/en-us/graph/api/resources/agentid-platform-overview?view=graph-rest-1.0):
  supports identity-blueprint/agent-identity grouping in Entra. Agent Registry
  families are retained as Uncategorized rather than assumed to be Copilot.
- [Scopes and permissions in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc#openid-connect-scopes):
  supports the four-value OpenID group. This grouping does not introduce login.

Security / Compliance covers explicit threat, audit, security content, information
protection and compliance descriptions. Workload-specific `AuditLogsQuery-*`
permissions stay here because they query compliance audit data; they are not mailbox
or file CRUD permissions. `SecurityCopilotWorkspaces` stays here rather than being
assigned to Microsoft 365 Copilot. `AiEnterpriseInteraction` stays Uncategorized:
its snapshot text says AI enterprise interactions without identifying Copilot.

Microsoft 365 / Platform is an explicit whitelist for identified cross-service
features such as Microsoft 365 Backup, service health, reports, Microsoft Graph
MCP and organization settings. It is not the unknown-family fallback. Likewise,
Uncategorized preserves both unclear product attribution and cross-product concepts
for which this version has no suitable evidence-based category. This is an explicit
limit of the map, not a missing record or an assertion that the permission is invalid.

## Snapshot coverage

Input: `data/commercial-graph-permlist.json`, SHA256
`d566bed3c4d7a4cf09ec54d35c25aee7b232df5b46c765af7a377dd9fe0b96a0`.

The snapshot contains 788 Application and 876 Delegated definitions: 1,664 ordinary
definitions, 1,036 distinct values and 404 distinct original first segments.
All receive a valid category and family, including the four disabled definitions.
The 60 resource-specific application definitions are excluded from these counts.
The map contains 341 explicit family entries, four exact OIDC values and eight exact
category overrides; every entry/override exists in the snapshot and family entries
have no duplicates.

| Category | Definitions | Distinct values |
| --- | ---: | ---: |
| Microsoft Entra ID | 634 | 355 |
| Exchange | 73 | 54 |
| SharePoint / OneDrive | 51 | 30 |
| Microsoft Teams | 246 | 196 |
| Copilot | 26 | 16 |
| Security / Compliance | 179 | 100 |
| Intune / Windows | 57 | 30 |
| Microsoft Search | 22 | 11 |
| Microsoft Viva | 31 | 21 |
| Education | 26 | 26 |
| Tasks / Work management | 20 | 14 |
| OneNote | 8 | 6 |
| Microsoft Bookings | 8 | 4 |
| Universal Print | 33 | 25 |
| Microsoft 365 / Platform | 57 | 31 |
| OpenID permissions | 4 | 4 |
| Uncategorized | 189 | 113 |
| **Total** | **1,664** | **1,036** |

Thus 1,475 definitions / 923 values receive a product or feature category;
189 definitions / 113 values are explicitly retained as Uncategorized. Their 59
families are:

```text
AgentCard AgentCardManifest AgentCollection AgentCommunicationConfiguration
AgentInstance AgentRegistration AiEnterpriseInteraction Analytics ApprovalSolution
ApprovalSolutionResponse BillingConfiguration CaseManagement ChangeManagement
ConfigurationMonitoring Contracts CrossTenantContentMigration CustomObject
CustomObjectDefinition CustomTags ExternalUserProfile Family
FileIngestionHybridOnboarding Financials Goals-Export HardDeletionSetting
HealthMonitoringAlert HealthMonitoringAlertConfig IndustryData
IndustryData-DataConnector IndustryData-InboundFlow IndustryData-OutboundFlow
IndustryData-ReferenceDefinition IndustryData-Run IndustryData-SourceSystem
IndustryData-TimePeriod Insights-UserMetric Notifications PendingExternalUserProfile
People PeopleSettings Place PlaceDevice PlaceDeviceTelemetry ProfilePhoto
ProgramControl RemoteTenantGroups ResourcePolicyAssignment
ResourcePolicyConfiguration ResourcePolicyDefinition ResourcePolicyEvaluation
SentimentSurvey ShortNotes SubjectNameRegistration Subscription Topic UserActivity
UserNotification UserTimelineActivity Workbooks
```

In particular, short labels such as `Workbooks`, `Financials`, `Topic`, `ShortNotes`
and `Place` are not used to invent an Excel, Dynamics, Viva, OneNote or Exchange
assignment. Future revisions can narrow these with sufficient official evidence.

## Validation

On Node 22.16.0, standalone strict TypeScript checking passed:

```sh
./node_modules/.bin/tsc --target ES2022 --module commonjs --strict --noEmit --skipLibCheck apps/api/src/catalog/classification.ts
```

An isolated in-memory TypeScript transpilation and assertion pass checked every
ordinary source definition against the exported category set; exact family
preservation; all four OIDC values; exact overrides taking precedence over the
RoleManagement and Group family rules; complete-segment and case-sensitive matching;
unknown and empty values; and prototype-like names (`constructor.Read`, `toString`).
It also checked that all whitelist/override entries exist in the source and no family
has duplicate assignments. The coverage table above is computed from that pass,
without filtering disabled records. Integration validation is recorded in the stage
implementation plan; this isolated check does not claim live Microsoft Graph or
SharePoint acceptance.
