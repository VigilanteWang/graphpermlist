/** 记录复制按钮的状态。浏览器拒绝写入剪贴板时，界面可以提示用户手动复制。 */
import * as React from 'react';

/** 当前复制操作的状态；只有 Clipboard 写入成功才进入 copied。 */
type CopyStatus = 'idle' | 'copying' | 'copied' | 'failed';

/** 单个复制按钮的操作和状态。复制一个 GUID 只会更新它旁边的提示。 */
export function useCopyValue(value: string) {
  const [status, setStatus] = React.useState<CopyStatus>('idle');

  /** 当前文本的 Clipboard 写入操作；浏览器拒绝或不支持时转为手动复制提示。 */
  async function copy(): Promise<void> {
    // 等待浏览器确认时跳过重复点击。按钮仍保留键盘焦点。
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
