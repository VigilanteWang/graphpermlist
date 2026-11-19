/** permission 表格中逐条展示官方字段的专用组件。 */
import * as React from 'react';
import { Text } from '@fluentui/react-components';
import type { MergedPermissionRow } from '@graph/contracts';
import { DefinitionLabel } from '../../components/DefinitionLabel.js';
import { useGridStyles } from '../PermissionGrid.styles.js';

/** 列表中的官方字段视图，逐条保留 definitions，避免同类型的不同 GUID 文案被覆盖。 */
export function DefinitionField({
  row,
  field
}: {
  row: MergedPermissionRow;
  field: 'title' | 'description' | 'adminConsentRequired';
}): React.ReactElement {
  const styles = useGridStyles();
  return (
    <div className={styles.stack}>
      {row.definitions.map((definition) => (
        <div key={`${definition.permissionType}:${definition.id}`} className={styles.definition}>
          <DefinitionLabel
            definition={definition}
            showId={
              row.definitions.filter((item) => item.permissionType === definition.permissionType).length > 1
            }
          />
          <Text>
            {field === 'adminConsentRequired'
              ? definition.adminConsentRequired
                ? 'Yes'
                : 'No'
              : definition[field]}
          </Text>
        </div>
      ))}
    </div>
  );
}
