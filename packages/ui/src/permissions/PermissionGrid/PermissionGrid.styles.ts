/** permission 表格的局部滚动、单元格与 definition 排版样式。 */
import { makeStyles, tokens } from '@fluentui/react-components';

/** permission 表格的局部滚动、单元格与 definition 排版样式。仅生成局部类名，不修改前端全局样式。 */
export const useGridStyles = makeStyles({
  scroll: { overflowX: 'auto', width: '100%', minWidth: '0' },
  grid: { minWidth: '960px' },
  cell: {
    minWidth: '0',
    alignItems: 'flex-start',
    overflowWrap: 'anywhere',
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM
  },
  stack: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, minWidth: '0' },
  definition: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  name: {
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
    textAlign: 'left',
    justifyContent: 'flex-start',
    height: 'auto'
  }
});
