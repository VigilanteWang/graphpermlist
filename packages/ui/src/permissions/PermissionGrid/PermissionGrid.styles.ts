/** permission 表格的局部滚动、单元格与 definition 排版样式。 */
import { makeStyles, tokens } from '@fluentui/react-components';

/** permission 表格的样式。单元格允许长文本换行，表格仍放不下时只在表格区域横向滚动。 */
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
