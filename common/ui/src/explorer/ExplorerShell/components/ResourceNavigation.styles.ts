/** resource 主导航的宽窄容器与页脚排版。 */
import { makeStyles, tokens } from '@fluentui/react-components';

/** 主导航的布局。较宽时是侧栏，窄布局下导航项排成两列。 */
export const useNavigationStyles = makeStyles({
  nav: {
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'start',
    position: 'sticky',
    top: '0',
    gap: '8px',
    padding: '24px 16px',
    minWidth: '0'
  },
  viewportNav: {
    position: 'static',
    alignSelf: 'stretch',
    minHeight: '0',
    overflowY: 'auto',
    boxSizing: 'border-box'
  },
  navTitle: { fontSize: tokens.fontSizeBase500, lineHeight: tokens.lineHeightBase500, marginBottom: '8px' },
  navFooter: { marginTop: 'auto', paddingTop: '16px' },
  narrowFooter: { gridColumn: '1 / -1', marginTop: '0', paddingTop: '4px' },
  narrowNav: {
    position: 'static',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    padding: '12px',
    '& > strong': { gridColumn: '1 / -1' }
  }
});
