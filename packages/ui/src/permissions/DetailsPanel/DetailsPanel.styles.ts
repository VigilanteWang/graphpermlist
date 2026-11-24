/** permission 详情抽屉、字段与复制控件的局部样式。 */
import { makeStyles, tokens } from '@fluentui/react-components';

/** permission 详情抽屉、字段与复制控件的局部样式。仅生成局部类名，不修改前端全局样式。 */
export const useDetailStyles = makeStyles({
  stack: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, minWidth: '0' },
  // 自定义 portal 容器时 Fluent 默认 absolute；详情仍须相对于视口定位。
  backdrop: { position: 'fixed' },
  // 百分比上限遵守 modal 滚动锁预留的滚动条宽度，避免窄屏左侧被裁切。
  drawer: { position: 'fixed', width: 'min(592px, 100vw)', maxWidth: '100%', boxSizing: 'border-box' },
  body: { minWidth: '0', overflowWrap: 'anywhere', paddingBottom: tokens.spacingVerticalL },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2
  },
  copy: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS, minWidth: '0' }
});
