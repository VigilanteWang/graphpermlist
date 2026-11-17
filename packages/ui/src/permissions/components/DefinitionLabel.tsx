/** 表格与详情共用的 definition 类型、禁用状态及可选 GUID 标签。 */
import * as React from 'react';
import { Badge, Caption1, makeStyles, tokens } from '@fluentui/react-components';
import type { PermissionDefinition } from '@graph/contracts';

/** definition 标签的局部排版；两个简单规则与其唯一使用组件就近维护。 */
const useLabelStyles = makeStyles({
  labels: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalXS, alignItems: 'center' },
  muted: { color: tokens.colorNeutralForeground3 }
});

/** 单条定义的类型与状态标签；同类型多 GUID 时显示 GUID 以消除字段归属歧义。 */
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
