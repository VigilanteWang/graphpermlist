/** service category 操作卡片的响应式排版。 */
import { makeStyles, tokens } from '@fluentui/react-components';

/** category 卡片网格。空间足够时多列并排，容器比 230px 窄时允许单张卡片继续缩小。 */
export const useCategoryStyles = makeStyles({
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
    gap: '14px'
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'start',
    textAlign: 'left',
    whiteSpace: 'normal',
    padding: '20px',
    gap: '12px',
    minHeight: '170px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow2
  }
});
