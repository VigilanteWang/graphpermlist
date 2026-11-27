/** 进入 category 后看到的 family 列表。展开一个 family 就会显示这一组的 permission 表格。 */
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

/** family 列表需要的分组数据、已展开名单和打开 permission 详情的操作。 */
interface FamilyPermissionsProps {
  browse: ReturnType<typeof useFamilyBrowse>;
  onOpenPermission: (value: string) => void;
}

/** family 折叠列表。用户点击标题时，把更新后的完整展开名单交给 useFamilyBrowse 保存。 */
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
