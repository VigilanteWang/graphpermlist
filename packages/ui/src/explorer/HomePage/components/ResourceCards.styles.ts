/** resource 入口按钮与卡片网格的局部样式。 */
import { makeStyles, tokens } from '@fluentui/react-components';

/** 固定 resource 卡片的阅读尺寸，并允许小于 240px 的容器继续收缩。 */
export const useResourceCardsStyles = makeStyles({
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
  },
  // resource 卡片保持 240–340px；容器更窄时允许收缩，避免横向滚动。
  resourceCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
    maxWidth: '1052px',
    gap: '16px'
  },
  resourceCard: {
    boxSizing: 'border-box',
    width: '100%',
    maxWidth: '340px',
    height: '200px',
    justifyContent: 'space-between'
  },
  comingSoonCard: { backgroundColor: tokens.colorNeutralBackground3 }
});
