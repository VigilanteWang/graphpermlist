/** Home 与 permission 详情共用的 Fluent 字段表，保留字段名和原始值之间的可访问关系。 */
import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHeaderCell,
  TableRow,
  Text,
  makeStyles,
  tokens
} from '@fluentui/react-components';

/** 一个元数据字段；value 可包含官方文本、GUID 或其复制控件。 */
export interface MetadataField {
  label: string;
  value: React.ReactNode;
}

/** 字段表的参数；label 为整张表提供英文无障碍名称。 */
interface MetadataTableProps {
  label: string;
  fields: MetadataField[];
}

/** 字段表的局部样式；固定列布局使长 GUID 和官方文案在窄容器中换行。 */
const useMetadataStyles = makeStyles({
  table: { width: '100%', tableLayout: 'fixed' },
  label: {
    width: '34%',
    verticalAlign: 'top',
    overflowWrap: 'anywhere',
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS
  },
  value: {
    verticalAlign: 'top',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS
  }
});

/** 左列显示字段名，右列显示传入的值。字段名是行标题，让屏幕阅读器能把 GUID 或文案和对应字段关联起来。 */
export function MetadataTable({ label, fields }: MetadataTableProps): React.ReactElement {
  const styles = useMetadataStyles();
  return (
    <Table aria-label={label} className={styles.table}>
      <TableBody>
        {fields.map((field) => (
          <TableRow key={field.label}>
            <TableHeaderCell scope="row" role="rowheader" className={styles.label}>
              <Text weight="semibold">{field.label}</Text>
            </TableHeaderCell>
            <TableCell className={styles.value}>{field.value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
