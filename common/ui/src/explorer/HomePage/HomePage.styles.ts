/** Home 页面组装层的局部布局样式。 */
import { makeStyles } from '@fluentui/react-components';

/** Home 的纵向区块间距与标题样式；各子区块自行维护内部样式。 */
export const useHomeStyles = makeStyles({
  stack: { display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '0' },
  heading: { margin: '0', outlineOffset: '4px' }
});
