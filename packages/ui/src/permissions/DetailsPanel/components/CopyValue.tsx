/** permission 详情使用的 Clipboard 按钮、操作反馈和手动复制输入框。 */
import * as React from 'react';
import { Button, Input, Text } from '@fluentui/react-components';
import { useDetailStyles } from '../DetailsPanel.styles.js';
import { useCopyValue } from '../hooks/useCopyValue.js';

/** Clipboard 控件的属性，label 是按钮及手动复制输入框的英文名称。 */
interface CopyValueProps {
  value: string;
  label: string;
}

/** 复制按钮和反馈。浏览器拒绝复制时显示只读输入框，聚焦输入框会选中整段文字。 */
export function CopyValue({ value, label }: CopyValueProps): React.ReactElement {
  const styles = useDetailStyles();
  const { status, copy } = useCopyValue(value);
  return (
    <div className={styles.copy}>
      <Button
        size="small"
        aria-disabled={status === 'copying'}
        onClick={() => {
          void copy();
        }}
      >
        Copy {label}
      </Button>
      <Text role="status">
        {status === 'copied'
          ? `${label} copied.`
          : status === 'failed'
            ? 'Copy failed. Select the text below and copy it manually.'
            : ''}
      </Text>
      {status === 'failed' && (
        <Input
          aria-label={`${label} for manual copy`}
          readOnly
          value={value}
          onFocus={(event) => event.target.select()}
        />
      )}
    </div>
  );
}
