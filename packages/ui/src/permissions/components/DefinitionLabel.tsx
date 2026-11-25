/** 表格与详情共用的 definition 类型、禁用状态及可选 GUID 标签。 */
import * as React from 'react';
import { Badge, Caption1, makeStyles, tokens } from '@fluentui/react-components';
import type { PermissionDefinition } from '@graph/contracts';

/** 让类型、Disabled 标签和 GUID 在空间不足时可以换行。 */
const useLabelStyles = makeStyles({
  labels: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalXS, alignItems: 'center' },
  muted: { color: tokens.colorNeutralForeground3 }
});

/** 单条 definition 的类型和禁用标记。调用方可以要求显示 GUID，方便区分列表中同类型的多条记录。 */
export function DefinitionLabel({
  definition,
  showId = false
}: {
  definition: PermissionDefinition;
  showId?: boolean;
}): React.ReactElement {
  const styles = useLabelStyles();
  return (
    <div className={styles.labels}>
      <Badge appearance="tint" color={definition.permissionType === 'Application' ? 'brand' : 'success'}>
        {definition.permissionType}
      </Badge>
      {!definition.isEnabled && (
        <Badge appearance="outline" color="warning">
          Disabled
        </Badge>
      )}
      {showId && <Caption1 className={styles.muted}>{definition.id}</Caption1>}
    </div>
  );
}
