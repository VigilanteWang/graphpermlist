/** 目录请求的可重试错误提示，供外壳和 Home 共用。 */
import * as React from 'react';
import { Button, MessageBar, MessageBarBody } from '@fluentui/react-components';

/** 目录请求错误提示组件，允许在原位置重试失败的请求。 */
export function RequestError({ error, retry }: { error: string; retry: () => void }): React.ReactElement {
  return (
    <MessageBar intent="error">
      <MessageBarBody>
        Catalog error: {error} <Button onClick={retry}>Retry</Button>
      </MessageBarBody>
    </MessageBar>
  );
}
