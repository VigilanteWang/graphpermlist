/** 目录外壳的布局与主内容滚动样式。 */
import { makeStyles, tokens } from '@fluentui/react-components';

/** 目录外壳的布局与主内容滚动样式。仅作用于当前组件。 */
export const useExplorerStyles = makeStyles({
  root: {
    boxSizing: 'border-box',
    minWidth: '0',
    width: '100%',
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusXLarge,
    overflowWrap: 'anywhere',
    fontFamily: tokens.fontFamilyBase
  },
  layout: { display: 'grid', gridTemplateColumns: '200px minmax(0, 1fr)', minHeight: '680px' },
  // 仅独立网站启用 viewport 布局；SPFx 默认让SharePoint 页面决定高度与滚动。
  viewportRoot: { height: '100dvh', overflow: 'hidden', borderRadius: '0' },
  viewportLayout: { height: '100%', minHeight: '0', gridTemplateRows: 'minmax(0, 1fr)' },
  narrowLayout: { gridTemplateColumns: 'minmax(0, 1fr)', minHeight: '0' },
  narrowViewportLayout: { gridTemplateRows: 'auto minmax(0, 1fr)' },
  main: {
    minWidth: '0',
    padding: '24px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge
  },
  viewportMain: { minHeight: '0', overflowY: 'auto', scrollbarGutter: 'stable', borderRadius: '0' },
  narrowMain: { padding: '12px' }
});
