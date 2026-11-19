/** family 操作按钮和 Accordion 宽度约束。 */
import { makeStyles } from '@fluentui/react-components';

/** family 操作按钮和 Accordion 宽度约束。仅作用于当前组件。 */
export const useFamilyStyles = makeStyles({
  actions: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  group: { minWidth: '0', '& > div': { minWidth: '0' } }
});
