/** permission 表格中逐条展示官方字段的专用组件。 */
import * as React from 'react';
import { Text } from '@fluentui/react-components';
import type { MergedPermissionRow } from '@graph/contracts';
import { DefinitionLabel } from '../../components/DefinitionLabel.js';
import { useGridStyles } from '../PermissionGrid.styles.js';

/** 表格中的一个字段单元格，例如 Summary。若筛选结果里同为 Application 的 definition 有两条，就分别显示文案并带上各自的 GUID。 */
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
