/** 单条 permission definition 的完整官方字段与 GUID 复制入口。 */
import * as React from 'react';
import { Card } from '@fluentui/react-components';
import type { PermissionDefinition } from '@graph/contracts';
import { MetadataTable } from '../../../components/MetadataTable.js';
import { DefinitionLabel } from '../../components/DefinitionLabel.js';
import { useDetailStyles } from '../DetailsPanel.styles.js';
import { CopyValue } from './CopyValue.js';

/** 完整定义详情；保留官方原文、admin consent 规则及 Delegated 专有字段。 */
export function DefinitionDetails({ definition }: { definition: PermissionDefinition }): React.ReactElement {
  const styles = useDetailStyles();
  const fields = [
    {
      label: 'GUID',
      value: (
        <>
          {definition.id}
          <CopyValue value={definition.id} label="GUID" />
        </>
      )
    },
    { label: 'Summary (official title)', value: definition.title },
    { label: 'Consent message', value: definition.description },
    {
      label: 'Admin consent required',
      value: definition.adminConsentRequired ? 'Yes (Required)' : 'No (Not required)'
    },
    { label: 'Admin consent rule', value: definition.adminConsentRule },
    { label: 'Enabled', value: definition.isEnabled ? 'Yes' : 'No (disabled)' },
    // Delegated 专有字段保持原始定义的取值，不通过 UI 推算 consent 规则。
    ...(definition.permissionType === 'Delegated'
      ? [
          { label: 'Consent type', value: definition.consentType },
          { label: 'User consent title', value: definition.userConsentTitle },
          { label: 'User consent description', value: definition.userConsentDescription }
        ]
      : [])
  ];
  return (
    <Card
      role="region"
      className={styles.section}
      aria-label={`${definition.permissionType} ${definition.id}`}
    >
      <DefinitionLabel definition={definition} />
      <MetadataTable label="Definition fields" fields={fields} />
    </Card>
  );
}
