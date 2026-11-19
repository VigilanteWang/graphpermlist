/** Clipboard 写入的状态 Hook；浏览器不允许自动复制时由展示组件提供手动复制入口。 */
import * as React from 'react';

/** 当前复制操作的状态；只有 Clipboard 写入成功才进入 copied。 */
type CopyStatus = 'idle' | 'copying' | 'copied' | 'failed';

/** 单个文本值的 Clipboard 操作和状态；各复制控件独立维护自己的反馈。 */
export function useCopyValue(value: string) {
  const [status, setStatus] = React.useState<CopyStatus>('idle');

  /** 当前文本的 Clipboard 写入操作；浏览器拒绝或不支持时转为手动复制提示。 */
  async function copy(): Promise<void> {
    // 不禁用原生按钮，避免 Clipboard Promise 等待期间丢失键盘焦点。
    if (status === 'copying') return;
    setStatus('copying');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  }

  return { status, copy };
}
