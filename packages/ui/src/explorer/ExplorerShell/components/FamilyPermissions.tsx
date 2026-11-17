/** 按 family 组织的 permission 浏览视图，展开状态由外壳生命周期内的 Hook 持有。 */
import * as React from 'react';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Button
} from '@fluentui/react-components';
import { PermissionGrid } from '../../../permissions/PermissionGrid/PermissionGrid.js';
import type { useFamilyBrowse } from '../hooks/useFamilyBrowse.js';
import { useFamilyStyles } from './FamilyPermissions.styles.js';

/** family 浏览视图的分组、受控展开模型和 permission 详情入口。 */
interface FamilyPermissionsProps {
  browse: ReturnType<typeof useFamilyBrowse>;
  onOpenPermission: (value: string) => void;
}

/** 二级目录的 Fluent Accordion 和 DataGrid 组合，不重新执行 definition 筛选。 */
export function FamilyPermissions({ browse, onOpenPermission }: FamilyPermissionsProps): React.ReactElement {
  const styles = useFamilyStyles();
  return (
    <>
      <div className={styles.actions}>
        <Button onClick={browse.expandAll}>Expand all</Button>
        <Button onClick={browse.collapseAll}>Collapse all</Button>
      </div>
      <Accordion
        multiple
        collapsible
        openItems={browse.open}
        onToggle={(_, data) => browse.setOpen(data.openItems as string[])}
      >
        {browse.groups.map(([family, items]) => (
          <AccordionItem value={family} key={family} className={styles.group}>
            <AccordionHeader>
              {family} ({items.length})
            </AccordionHeader>
            <AccordionPanel>
              <PermissionGrid rows={items} onOpen={onOpenPermission} />
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  );
}
