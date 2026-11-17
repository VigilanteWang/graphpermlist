/** permission 详情抽屉；编排完整定义展示和请求状态，不生成官方原文摘要。 */
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
import type { CatalogClient, PermissionQuery } from '@graph/contracts';
import { CopyValue } from './components/CopyValue.js';
import { DefinitionDetails } from './components/DefinitionDetails.js';
import { usePermissionDetails } from './hooks/usePermissionDetails.js';
import { useDetailStyles } from './DetailsPanel.styles.js';

/** permission 详情面板的属性；mountNode 可让宿主把 portal 放在 FluentProvider 的局部容器中。 */
export interface DetailsPanelProps {
  client: CatalogClient;
  resourceId: string;
  value: string | undefined;
  query: PermissionQuery;
  onClose: () => void;
  mountNode?: HTMLElement | null;
}

/** Fluent modal Drawer 详情面板；支持取消、过时结果隔离、Retry，以及全部定义的完整展示。 */
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
          {!current?.response && !current?.error && <Spinner label="Loading permission details" />}
          {current?.error && (
            <MessageBar intent="error">
              <MessageBarBody>
                {current.error} <Button onClick={retry}>Retry</Button>
              </MessageBarBody>
            </MessageBar>
          )}
          {current?.response?.allDefinitions.map((definition) => (
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
