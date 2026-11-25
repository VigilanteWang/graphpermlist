/** 目录搜索与筛选控件的响应式样式。 */
import { makeStyles, tokens } from '@fluentui/react-components';

/** 搜索和筛选区的样式。筛选项占满一行后可以换到下一行。 */
export const useToolbarStyles = makeStyles({
  toolbar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingBottom: '20px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    marginBottom: '24px'
  },
  // 明确各列的基础宽度与伸展比例，避免 family 选项长度改变两级页面的布局。
  filters: { display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'end', '& > *': { minWidth: '0' } },
  filterField: { flexGrow: 1, flexShrink: 1, flexBasis: '160px' },
  familyField: { flexGrow: 1.6, flexBasis: '256px' },
  filterSelect: { width: '100%', minWidth: '0', '& select': { width: '100%', minWidth: '0' } },
  clearSearch: { flexGrow: 1, flexShrink: 1, flexBasis: '140px' },
  search: { width: '100%', minWidth: '0', boxSizing: 'border-box' }
});
