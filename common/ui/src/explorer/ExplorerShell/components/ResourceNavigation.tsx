/** 使用 Fluent Nav 的 resource 主导航，选中状态由外壳统一控制。 */
import * as React from 'react';
import { Caption1, Nav, NavItem, Text, mergeClasses } from '@fluentui/react-components';
import type { CatalogResourceSummary } from '@graph/contracts';
import { useNavigationStyles } from './ResourceNavigation.styles.js';

/** 主导航的选中 resource、可用资源列表、前端名称和容器布局参数。 */
interface ResourceNavigationProps {
  resourceId?: string;
  resources: CatalogResourceSummary[];
  hostLabel: string;
  narrow: boolean;
  viewportLayout: boolean;
  onNavigate: (resourceId?: string) => void;
}

/** 页面左侧或顶部的主导航，始终提供 Home，并为目录返回的每个 resource 提供入口。 */
export function ResourceNavigation({
  resourceId,
  resources,
  hostLabel,
  narrow,
  viewportLayout,
  onNavigate
}: ResourceNavigationProps): React.ReactElement {
  const styles = useNavigationStyles();
  return (
    <Nav
      role="navigation"
      aria-label="Resources"
      selectedValue={resourceId ?? 'home'}
      onNavItemSelect={(_, data) => {
        onNavigate(data.value === 'home' ? undefined : data.value);
      }}
      className={mergeClasses(styles.nav, viewportLayout && styles.viewportNav, narrow && styles.narrowNav)}
    >
      <Text as="strong" size={500} weight="semibold" className={styles.navTitle}>
        Permissions Explorer
      </Text>
      <NavItem value="home">Home</NavItem>
      {resources.map((resource) => (
        <NavItem value={resource.resourceId} key={resource.resourceId}>{resource.displayName}</NavItem>
      ))}
      <Caption1 className={mergeClasses(styles.navFooter, narrow && styles.narrowFooter)}>
        {hostLabel} · Global cloud · Read-only
      </Caption1>
    </Nav>
  );
}
