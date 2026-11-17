/** permission 合并行表格，逐条展示匹配 definitions 的官方字段。 */
import * as React from 'react';
import {
  Button,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  createTableColumn
} from '@fluentui/react-components';
import type { PermissionRow } from '@graph/contracts';
import { DefinitionLabel } from '../components/DefinitionLabel.js';
import { DefinitionField } from './components/DefinitionField.js';
import { useGridStyles } from './PermissionGrid.styles.js';

/** permission 列表组件的属性，rows 仅包含命中筛选的定义，onOpen 接收 permission value。 */
export interface PermissionGridProps {
  rows: PermissionRow[];
  onOpen: (value: string) => void;
}

/** 基于 Fluent DataGrid 的 permission 列表；全部字段和类型标签均从当前 definitions 读取。 */
export function PermissionGrid({ rows, onOpen }: PermissionGridProps): React.ReactElement {
  const styles = useGridStyles();
  const columns = [
    createTableColumn<PermissionRow>({
      columnId: 'permission',
      renderHeaderCell: () => 'Permission',
      renderCell: (row) => (
        <Button appearance="transparent" className={styles.name} onClick={() => onOpen(row.value)}>
          {row.value}
        </Button>
      )
    }),
    createTableColumn<PermissionRow>({
      columnId: 'summary',
      renderHeaderCell: () => 'Summary',
      renderCell: (row) => <DefinitionField row={row} field="title" />
    }),
    createTableColumn<PermissionRow>({
      columnId: 'message',
      renderHeaderCell: () => 'Consent message',
      renderCell: (row) => <DefinitionField row={row} field="description" />
    }),
    createTableColumn<PermissionRow>({
      columnId: 'admin',
      renderHeaderCell: () => 'Admin consent required',
      renderCell: (row) => <DefinitionField row={row} field="adminConsentRequired" />
    }),
    createTableColumn<PermissionRow>({
      columnId: 'types',
      renderHeaderCell: () => 'Permission types',
      renderCell: (row) => (
        <div className={styles.stack}>
          {row.definitions.map((definition) => (
            <DefinitionLabel
              key={`${definition.permissionType}:${definition.id}`}
              definition={definition}
              showId={
                row.definitions.filter((item) => item.permissionType === definition.permissionType).length > 1
              }
            />
          ))}
        </div>
      )
    })
  ];
  return (
    <div className={styles.scroll}>
      <DataGrid
        className={styles.grid}
        items={rows}
        columns={columns}
        getRowId={(row) => `${row.resourceId}:${row.value}`}
        aria-label="Permissions"
        focusMode="composite"
      >
        <DataGridHeader>
          <DataGridRow>
            {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
          </DataGridRow>
        </DataGridHeader>
        <DataGridBody<PermissionRow>>
          {({ item, rowId }) => (
            <DataGridRow<PermissionRow> key={rowId}>
              {({ renderCell, columnId }) => (
                <DataGridCell
                  className={styles.cell}
                  focusMode={columnId === 'permission' ? 'group' : 'cell'}
                >
                  {renderCell(item)}
                </DataGridCell>
              )}
            </DataGridRow>
          )}
        </DataGridBody>
      </DataGrid>
    </div>
  );
}
