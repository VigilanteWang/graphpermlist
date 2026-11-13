/** Editorial navigation taxonomy; never used to infer authorization or API support. */
export const CLASSIFICATION_VERSION = '2026-11-13.1';

export const CATEGORIES = [
  { category: 'entra', displayName: 'Microsoft Entra ID', description: 'Directory, identity, authentication, access governance and provisioning.' },
  { category: 'exchange', displayName: 'Exchange', description: 'Mail, calendars, mailbox contacts and Exchange service configuration.' },
  { category: 'sharepoint-onedrive', displayName: 'SharePoint / OneDrive', description: 'Sites, files, lists, term stores and SharePoint Embedded storage.' },
  { category: 'teams', displayName: 'Microsoft Teams', description: 'Teams, chats, channels, calling, online meetings and Shifts.' },
  { category: 'copilot', displayName: 'Copilot', description: 'Explicit Copilot conversations, packages, settings and cost management.' },
  { category: 'security-compliance', displayName: 'Security / Compliance', description: 'Threat protection, security operations, audit, information protection and compliance.' },
  { category: 'devices-windows', displayName: 'Intune / Windows', description: 'Intune management, Cloud PCs, Windows settings and updates.' },
  { category: 'search', displayName: 'Microsoft Search', description: 'Search configuration, search answers and external connections and items.' },
  { category: 'viva', displayName: 'Microsoft Viva', description: 'Explicit Viva Engage and learning content permissions.' },
  { category: 'education', displayName: 'Education', description: 'Education administration, assignments, curricula, roster and reports.' },
  { category: 'tasks', displayName: 'Tasks / Work management', description: 'Task and business scenario data and configuration.' },
  { category: 'onenote', displayName: 'OneNote', description: 'OneNote notebooks, sections and pages.' },
  { category: 'bookings', displayName: 'Microsoft Bookings', description: 'Bookings businesses, appointments, customers, services and staff.' },
  { category: 'print', displayName: 'Universal Print', description: 'Printers, print jobs, connectors, shares and print settings.' },
  { category: 'platform', displayName: 'Microsoft 365 / Platform', description: 'Explicit cross-service Microsoft 365 administration and platform features.' },
  { category: 'openid', displayName: 'OpenID permissions', description: 'OpenID Connect sign-in scopes and offline access.' },
  { category: 'uncategorized', displayName: 'Uncategorized', description: 'Unknown families or permissions with insufficient evidence for a product assignment.' },
];

// Exact values win over family rules, including cross-product families such as RoleManagement.
const EXACT_CATEGORIES: ReadonlyMap<string, string> = new Map([
  ['Group.ManageProtection.All', 'security-compliance'],
  ['RoleManagement.Read.All', 'platform'],
  ['RoleManagement.Read.CloudPC', 'devices-windows'],
  ['RoleManagement.ReadWrite.CloudPC', 'devices-windows'],
  ['RoleManagement.Read.Defender', 'security-compliance'],
  ['RoleManagement.ReadWrite.Defender', 'security-compliance'],
  ['RoleManagement.Read.Exchange', 'exchange'],
  ['RoleManagement.ReadWrite.Exchange', 'exchange'],
]);

// Each token is the complete, case-sensitive first segment, not a startsWith pattern.
// Lists deliberately enumerate observed families so a future similarly named family
// cannot silently inherit a category. Evidence and conservative exclusions: docs/classification.md.
const FAMILY_GROUPS: ReadonlyArray<readonly [string, string]> = [
  ['entra', `APIConnectors AccessReview AdministrativeUnit AdministrativeUnitMember
    AgentIdUser AgentIdentity AgentIdentityBlueprint AgentIdentityBlueprintPrincipal
    Agreement AgreementAcceptance AppCertTrustConfiguration AppFederatedCredentialIssuers
    AppRoleAssignment Application Application-RemoteDesktopConfig AuthenticationContext
    ConsentRequest CrossTenantIdentityMapping CrossTenantInformation CrossTenantUserProfileSharing
    CustomAuthenticationExtension CustomSecAttributeAssignment CustomSecAttributeAuditLogs
    CustomSecAttributeDefinition CustomSecAttributeProvisioning DelegatedPermissionGrant
    Device DeviceLocalCredential DeviceTemplate Directory DirectoryRecommendations Domain
    Domain-InternalFederation EntitlementManagement EntitlementMgmt-SubjectAccess EntraBackup
    EventListener Group Group-NestingSupport Group-OnPremisesSyncBehavior Group-PreferredDataLocation
    Group-XTenantIdentitySync GroupMember GroupSettings IdentityDiagnostic IdentityNotifications
    IdentityProvider IdentityRiskEvent IdentityRiskyAgent IdentityRiskyServicePrincipal IdentityRiskyUser
    IdentityUserFlow LicenseAssignment LifecyclePolicies-AgentId LifecyclePolicies-Guests LifecycleWorkflows
    LifecycleWorkflows-CustomExt LifecycleWorkflows-Reports LifecycleWorkflows-Workflow Member
    MultiTenantOrganization MutualTlsOauthConfiguration NetworkAccess NetworkAccess-Reports
    NetworkAccessBranch NetworkAccessPolicy OnPremDirectorySynchronization OnPremisesPublishingProfiles
    OrgContact Organization OrganizationalBranding Policy PreAuthorizationGrant PrivilegedAccess
    PrivilegedAccess-CustomExt PrivilegedAssignmentSchedule PrivilegedEligibilitySchedule
    AuditLog ProvisioningLog PublicKeyInfrastructure RoleAssignmentSchedule RoleEligibilitySchedule RoleManagement
    RoleManagement-Authorization RoleManagementAlert RoleManagementPolicy ServicePrincipalEndpoint
    SignInIdentifier SpiffeTrustDomain Synchronization SynchronizationData-User SynchronizationMetadata
    TenantGovernance-Invitation TenantGovernance-PolicyTemplate TenantGovernance-RelatedTenant
    TenantGovernance-Relationship TenantGovernance-Request TenantGovernance-Setting TrustFrameworkKeySet
    UnifiedGroupMember User User-ConvertToInternal User-LifeCycleInfo User-Mail User-OnPremisesSyncBehavior
    User-PasswordProfile User-Phone UserAuthMethod-Email UserAuthMethod-External UserAuthMethod-HardwareOATH
    UserAuthMethod-MicrosoftAuthApp UserAuthMethod-Passkey UserAuthMethod-Password UserAuthMethod-Phone
    UserAuthMethod-PlatformCred UserAuthMethod-QR UserAuthMethod-ResourceKey UserAuthMethod-SoftwareOATH
    UserAuthMethod-TAP UserAuthMethod-WindowsHello UserAuthenticationMethod UserCertificateIds VerifiedId-Profile`],
  ['exchange', `Calendars Contacts Contacts-OnPremisesSyncBehavior EAS EWS ExchangeMessageTrace
    Group-Conversation IMAP Mail Mail-Advanced MailTips MailboxConfigItem MailboxFolder MailboxItem
    MailboxSettings POP SMTP ServiceActivity-Exchange`],
  ['sharepoint-onedrive', `FileIngestion FileStorageContainer
    FileStorageContainerType FileStorageContainerTypeReg Files ListItems Lists ServiceActivity-OneDrive
    SharePointCrossTenantMigration SharePointTenantSettings Sites TermStore`],
  ['teams', `AppCatalog CallAiInsights CallDelegation CallEvents CallEvents-Emergency CallRecord-PstnCalls
    CallRecordings CallRecords CallTranscripts Calls Channel ChannelMember ChannelMessage ChannelSettings
    Chat ChatMember ChatMessage OnlineMeetingAiInsight OnlineMeetingArtifact OnlineMeetingRecording
    OnlineMeetingTranscript OnlineMeetings Presence RealTimeActivityFeed ResourceSpecificPermissionGrant
    Schedule Schedule-WorkingTime SchedulePermissions ServiceActivity-Teams Team TeamMember TeamSettings
    TeamTemplates TeamsActivity TeamsAppInstallation TeamsPolicyUserAssign TeamsResourceAccount TeamsTab
    TeamsTelephoneNumber TeamsUserConfiguration Teamwork TeamworkAppSettings TeamworkCustomEmoji
    TeamworkDevice TeamworkSection TeamworkTag TeamworkTargetedMessage TeamworkUserInteraction
    UserShiftPreferences UserTeamwork VirtualAppointment VirtualAppointmentNotification VirtualEvent
    VirtualEventRegistration-Anon WorkforceIntegration`],
  ['copilot', `CopilotConversation CopilotCostManagement CopilotCostManagement-Assignment
    CopilotCostManagement-CreditReq CopilotCostManagement-Policy CopilotCostManagement-Reports
    CopilotCostManagement-UserData CopilotPackages CopilotPolicySettings CopilotSettings-LimitedMode`],
  ['security-compliance', `AttackSimulation AuditActivity AuditLogsQuery AuditLogsQuery-CRM
    AuditLogsQuery-Endpoint AuditLogsQuery-Entra AuditLogsQuery-Exchange AuditLogsQuery-OneDrive
    AuditLogsQuery-SharePoint AutomationRules CloudApp-Discovery Content ContentActivity ContentHub-Catalog
    ContentHub-Installed CustomDetection InfoProtectABACPolicy InfoProtectAttributeAssignment
    InfoProtectAttributeDefinition InformationProtectionConfig InformationProtectionContent
    InformationProtectionPolicy LockboxRequest LockboxSettings Perception ProtectionScopes RecordsManagement
    Repository RiskPreventionProviders PartnerSecurity SecurityActions SecurityAlert SecurityAnalyzedMessage
    SecurityCopilotWorkspaces SecurityEvents SecurityIdentitiesAccount SecurityIdentitiesActions
    SecurityIdentitiesAutoConfig SecurityIdentitiesHealth SecurityIdentitiesMigration SecurityIdentitiesSensors
    SecurityIdentitiesUserActions SecurityIncident SensitivityLabel SensitivityLabels SubjectRightsRequest
    ThreatAssessment ThreatHunting ThreatIndicators ThreatIntelligence ThreatSubmission ThreatSubmissionPolicy eDiscovery`],
  ['devices-windows', `BitlockerKey BrowserSiteLists CloudPC DeviceManagementApps DeviceManagementCloudCA
    DeviceManagementConfiguration DeviceManagementDeploymentPlans DeviceManagementManagedDevices
    DeviceManagementRBAC DeviceManagementScripts DeviceManagementServiceConfig UserCloudClipboard
    UserWindowsSettings WindowsUpdates`],
  ['search', `Acronym Bookmark ExternalConnection ExternalItem QnA SearchConfiguration`],
  ['viva', `Community EngagementConversation EngagementExport EngagementMeetingConversation EngagementRole
    LearningAssignedCourse LearningContent LearningProvider LearningSelfInitiatedCourse Storyline`],
  ['education', `EduAdministration EduAssignments EduCurricula EduReports-Reading EduReports-Reflect EduRoster`],
  ['tasks', `BusinessScenarioConfig BusinessScenarioData OrgSettings-Todo Tasks`],
  ['onenote', `Notes`],
  ['bookings', `Bookings BookingsAppointment`],
  ['print', `PrintConnector PrintJob PrintSettings PrintTaskDefinition Printer PrinterShare PullPrintPrinter`],
  ['platform', `BackupRestore-Configuration BackupRestore-Control BackupRestore-Monitor BackupRestore-Restore
    BackupRestore-Search CloudLicensing DelegatedAdminRelationship ManagedTenants MCP OrgSettings-AppsAndServices
    OrgSettings-DynamicsVoice OrgSettings-Forms OrgSettings-Microsoft365Install PartnerBilling
    ReportSettings Reports ServiceActivity-Microsoft365Web ServiceHealth ServiceMessage ServiceMessageViewpoint`],
];

const FAMILY_CATEGORIES: ReadonlyMap<string, string> = new Map(
  FAMILY_GROUPS.flatMap(([category, families]) =>
    families.trim().split(/\s+/).map((family): [string, string] => [family, category])),
);
const OPENID_VALUES: ReadonlySet<string> = new Set(['openid', 'profile', 'email', 'offline_access']);

export function classifyPermission(value: string): { category: string; family: string } {
  if (OPENID_VALUES.has(value)) return { category: 'openid', family: 'OpenID permissions' };
  const family = value.split('.')[0] ?? value;
  return {
    category: EXACT_CATEGORIES.get(value) ?? FAMILY_CATEGORIES.get(family) ?? 'uncategorized',
    family,
  };
}
