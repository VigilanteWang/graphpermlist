/** 两级目录页面共用的受控搜索与筛选工具栏。 */
import * as React from 'react';
import { Button, Checkbox, Field, Input, mergeClasses, Select } from '@fluentui/react-components';
import type { PermissionQuery, PermissionType } from '@graph/contracts';
import { useToolbarStyles } from './CatalogToolbar.styles.js';

/** 工具栏当前条件、可选 family 及条件更新回调；不拥有请求或导航状态。 */
interface CatalogToolbarProps {
  criteria: PermissionQuery;
  families: string[];
  updateQuery: (patch: Partial<PermissionQuery>) => void;
}

/** 目录筛选输入组件；通过回调让两个页面始终使用同一份条件。 */
export function CatalogToolbar({ criteria, families, updateQuery }: CatalogToolbarProps): React.ReactElement {
  const styles = useToolbarStyles();
  return (
    <div className={styles.toolbar}>
      <Field label="Search permissions">
        <Input
          className={styles.search}
          value={criteria.q ?? ''}
          onChange={(_, data) => updateQuery({ q: data.value })}
          placeholder="Search name, GUID or official wording"
        />
      </Field>
      <div className={styles.filters}>
        <Field label="Permission type" className={styles.filterField}>
          <Select
            className={styles.filterSelect}
            value={criteria.permissionType ?? ''}
            onChange={(_, data) =>
              updateQuery({ permissionType: (data.value || undefined) as PermissionType | undefined })
            }
          >
            <option value="">All</option>
            <option>Delegated</option>
            <option>Application</option>
          </Select>
        </Field>
        <Field label="Admin consent" className={styles.filterField}>
          <Select
            className={styles.filterSelect}
            value={criteria.adminConsentRequired === undefined ? '' : String(criteria.adminConsentRequired)}
            onChange={(_, data) =>
              updateQuery({ adminConsentRequired: data.value === '' ? undefined : data.value === 'true' })
            }
          >
            <option value="">All</option>
            <option value="true">Required</option>
            <option value="false">Not required</option>
          </Select>
        </Field>
        <Field label="Permission family" className={mergeClasses(styles.filterField, styles.familyField)}>
          <Select
            className={styles.filterSelect}
            value={criteria.family ?? ''}
            onChange={(_, data) => updateQuery({ family: data.value || undefined })}
          >
            <option value="">All families</option>
            {families.map((family) => (
              <option key={family}>{family}</option>
            ))}
          </Select>
        </Field>
        <Checkbox
          label="Show disabled"
          checked={criteria.showDisabled ?? false}
          onChange={(_, data) => updateQuery({ showDisabled: data.checked === true })}
        />
        <Button className={styles.clearSearch} disabled={!criteria.q} onClick={() => updateQuery({ q: '' })}>
          Clear search
        </Button>
      </div>
    </div>
  );
}
