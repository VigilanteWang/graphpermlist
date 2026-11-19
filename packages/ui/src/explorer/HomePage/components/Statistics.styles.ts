/** Home 统计卡片的局部样式，不影响宿主或其他 Card。 */
import { makeStyles, tokens } from '@fluentui/react-components';

/** 允许统计卡片在窄容器内换行的样式集合。 */
export const useStatisticsStyles = makeStyles({
  stats: { display: 'flex', flexWrap: 'wrap', gap: '12px' },
  stat: {
    flex: '1 1 180px',
    padding: '20px',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusLarge
  }
});
