/** 点击 permission 名称后打开的详情抽屉。这里能看到该名称下的全部 definitions，包括禁用项。 */
import * as React from 'react';
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text
} from '@fluentui/react-components';
import type { CatalogClient, PermissionQueryOptions } from '@graph/contracts';
import { CopyValue } from './components/CopyValue.js';
import { DefinitionDetails } from './components/DefinitionDetails.js';
import { usePermissionDetails } from './hooks/usePermissionDetails.js';
import { useDetailStyles } from './DetailsPanel.styles.js';

/** 详情抽屉需要的查询条件和关闭操作。mountNode 让弹出的抽屉留在目录的 FluentProvider 容器内。 */
export interface DetailsPanelProps {
  client: CatalogClient;
  resourceId: string;
  value: string | undefined;
  query: PermissionQueryOptions;
  onClose: () => void;
  mountNode?: HTMLElement | null;
}

/** permission 详情抽屉。查询完成前显示加载提示，失败可重试，成功后每条 definition 单独显示。 */
export function DetailsPanel({
  client,
  resourceId,
  value,
  query,
  onClose,
  mountNode
}: DetailsPanelProps): React.ReactElement {
  const styles = useDetailStyles();
  const { current, retry } = usePermissionDetails(client, resourceId, value, query);
  return (
    <Drawer
      aria-label={`${value ?? 'Permission'} details`}
      type="overlay"
      modalType="modal"
      open={value !== undefined}
      position="end"
      size="medium"
      mountNode={mountNode}
      backdrop={{ className: styles.backdrop }}
      className={styles.drawer}
      onOpenChange={(_, data) => {
        if (!data.open) onClose();
      }}
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button appearance="subtle" onClick={onClose} aria-label="Close details">
              Close
            </Button>
          }
        >
          Permission details
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody className={styles.body}>
        <div className={styles.stack}>
          <Text weight="semibold">{value}</Text>
          {value !== undefined && <CopyValue key={value} value={value} label="permission name" />}
          <Text>
            Details include all definitions, including definitions that do not match the current filters and
            disabled definitions.
          </Text>
          {!current?.result && !current?.error && <Spinner label="Loading permission details" />}
          {current?.error && (
            <MessageBar intent="error">
              <MessageBarBody>
                {current.error} <Button onClick={retry}>Retry</Button>
              </MessageBarBody>
            </MessageBar>
          )}
          {current?.result?.allDefinitions.map((definition) => (
            <DefinitionDetails
              key={`${definition.permissionType}:${definition.id}`}
              definition={definition}
            />
          ))}
        </div>
      </DrawerBody>
    </Drawer>
  );
}
