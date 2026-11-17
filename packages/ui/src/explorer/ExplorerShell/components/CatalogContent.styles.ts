/** 目录内容主体、标题和减少动画的局部样式。 */
import { makeStyles } from '@fluentui/react-components';

/** 目录内容主体、标题和减少动画的局部样式。仅作用于当前组件。 */
export const useContentStyles = makeStyles({
  stack: { display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '0' },
  heading: { margin: '0', outlineOffset: '4px' },
  body: {
    animationName: {
      from: { opacity: 0, transform: 'translateX(16px)' },
      to: { opacity: 1, transform: 'translateX(0)' }
    },
    animationDuration: '180ms',
    animationTimingFunction: 'ease-out',
    '@media (prefers-reduced-motion: reduce)': { animationDuration: '0s', animationName: 'none' }
  }
});
