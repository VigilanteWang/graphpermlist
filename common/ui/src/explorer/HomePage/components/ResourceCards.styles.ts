/** resource 入口按钮与卡片网格的局部样式。 */
import { makeStyles, tokens } from '@fluentui/react-components';

/** 让 resource 卡片在窄容器继续收缩，并允许长名称换行时撑高卡片。 */
export const useResourceCardsStyles = makeStyles({
  resourceCard: {
    boxSizing: 'border-box',
    width: '100%',
    minWidth: '0',
    maxWidth: '340px',
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'start',
    justifyContent: 'space-between',
    textAlign: 'left',
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
    padding: '20px',
    gap: '12px',
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
  }
});
