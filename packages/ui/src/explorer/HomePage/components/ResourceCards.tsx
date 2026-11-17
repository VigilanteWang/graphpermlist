/** Home 的 API resource 入口，保留 Graph 导航及未来目录的禁用状态。 */
import * as React from 'react';
import { Body1, Button, Caption1, mergeClasses, Title2 } from '@fluentui/react-components';
import { useResourceCardsStyles } from './ResourceCards.styles.js';

/** resource 卡片的导航回调；页面状态与导航行为由外壳管理。 */
interface ResourceCardsProps {
  onBrowseGraph: () => void;
}

/** API resource 卡片列表；仅 Microsoft Graph 是当前可用的入口。 */
export function ResourceCards({ onBrowseGraph }: ResourceCardsProps): React.ReactElement {
  const styles = useResourceCardsStyles();
  return (
    <div className={styles.resourceCards} aria-label="API resources">
      <Button
        className={mergeClasses(styles.card, styles.resourceCard)}
        aria-label="Browse Microsoft Graph"
        onClick={onBrowseGraph}
      >
        <Title2>Microsoft Graph</Title2>
        <Body1>Explore permissions across Microsoft 365 services.</Body1>
        <Body1>Browse Microsoft Graph →</Body1>
      </Button>
      <Button disabled className={mergeClasses(styles.card, styles.resourceCard, styles.comingSoonCard)}>
        <Title2>Power BI</Title2>
        <Body1>Power BI permission catalog</Body1>
        <Caption1>Coming soon</Caption1>
      </Button>
      <Button disabled className={mergeClasses(styles.card, styles.resourceCard, styles.comingSoonCard)}>
        <Title2>SharePoint</Title2>
        <Body1>Separate SharePoint resource catalog</Body1>
        <Caption1>Coming soon</Caption1>
      </Button>
    </div>
  );
}
