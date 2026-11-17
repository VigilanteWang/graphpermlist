/** 使用 Fluent Nav 的 resource 主导航，选中状态由外壳统一控制。 */
import * as React from 'react';
import { Caption1, Nav, NavItem, Text, mergeClasses } from '@fluentui/react-components';
import type { ExplorerPage } from '../hooks/useExplorerController.js';
import { useNavigationStyles } from './ResourceNavigation.styles.js';

/** 主导航的当前页面、宿主说明与容器布局参数；只允许导航到已实现页面。 */
interface ResourceNavigationProps {
  page: ExplorerPage;
  hostLabel: string;
  narrow: boolean;
  viewportLayout: boolean;
  onNavigate: (page: ExplorerPage) => void;
}

/** resource 导航组件；Fluent NavItem 提供选中样式、aria-current 和禁用语义。 */
export function ResourceNavigation({
  page,
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
      selectedValue={page}
      onNavItemSelect={(_, data) => {
        // Coming soon 不是有效页面；不将任意 value 强制转换为页面类型。
        if (data.value === 'home' || data.value === 'graph') onNavigate(data.value);
      }}
      className={mergeClasses(styles.nav, viewportLayout && styles.viewportNav, narrow && styles.narrowNav)}
    >
      <Text as="strong" size={500} weight="semibold" className={styles.navTitle}>
        Permissions Explorer
      </Text>
      <NavItem value="home">Home</NavItem>
      <NavItem value="graph">Microsoft Graph</NavItem>
      <NavItem value="power-bi" disabled>
        Power BI · Coming soon
      </NavItem>
      <NavItem value="sharepoint" disabled>
        SharePoint · Coming soon
      </NavItem>
      <Caption1 className={mergeClasses(styles.navFooter, narrow && styles.narrowFooter)}>
        {hostLabel} · Global cloud · Read-only
      </Caption1>
    </Nav>
  );
}
