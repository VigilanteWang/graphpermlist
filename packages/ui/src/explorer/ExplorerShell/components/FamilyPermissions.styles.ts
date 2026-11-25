/** family 操作按钮和 Accordion 宽度约束。 */
import { makeStyles } from '@fluentui/react-components';

/** family 列表的样式。空间不足时，Expand all 和 Collapse all 可以换行。 */
export const useFamilyStyles = makeStyles({
  actions: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  group: { minWidth: '0', '& > div': { minWidth: '0' } }
});
