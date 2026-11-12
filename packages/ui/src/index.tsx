import * as React from 'react';
import {
  FluentProvider, webLightTheme, makeStyles, tokens,
  Title2, Body1, Caption1, Spinner, Button, MessageBar, MessageBarBody
} from '@fluentui/react-components';
import type { CatalogClient } from '@graph/api-client';
import type { ResourcesResponse } from '@graph/contracts';

const useStyles = makeStyles({
  root: { boxSizing: 'border-box', minWidth: '0', width: '100%', padding: tokens.spacingHorizontalL, borderRadius: tokens.borderRadiusLarge, backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground1 },
  layout: { display: 'grid', gap: tokens.spacingVerticalL, gridTemplateColumns: 'minmax(0, 160px) minmax(0, 1fr)', '@media (max-width: 560px)': { gridTemplateColumns: 'minmax(0, 1fr)' } },
  nav: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  content: { minWidth: '0', display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, overflowWrap: 'anywhere' },
  heading: { margin: '0' },
  notice: { padding: tokens.spacingHorizontalM, backgroundColor: tokens.colorNeutralBackground2, borderRadius: tokens.borderRadiusMedium }
});
export interface ExplorerShellProps { client: CatalogClient; hostLabel: string; }

/** Stage 1 connectivity shell shared unchanged by Vite and SPFx. No fixture data. */
export function ExplorerShell({ client, hostLabel }: ExplorerShellProps): React.ReactElement {
  const styles = useStyles();
  const [response, setResponse] = React.useState<ResourcesResponse>();
  const [error, setError] = React.useState<string>();
  const [attempt, setAttempt] = React.useState(0);
  React.useEffect(() => {
    const abort = new AbortController();
    setResponse(undefined); setError(undefined);
    client.resources(abort.signal).then(setResponse).catch((err: unknown) => {
      if (!abort.signal.aborted) setError(err instanceof Error ? err.message : 'Catalog API is unavailable');
    });
    return () => abort.abort();
  }, [client, attempt]);
  return <FluentProvider theme={webLightTheme} className={styles.root}>
    <div className={styles.layout}>
      <nav aria-label="Resources" className={styles.nav}>
        <Body1><strong>Permissions Explorer</strong></Body1>
        <Button appearance="primary" aria-current="page">Home</Button>
        <Button disabled>Microsoft Graph</Button>
        <Button disabled>Power BI · Coming soon</Button>
        <Button disabled>SharePoint · Coming soon</Button>
      </nav>
      <main className={styles.content}>
        <Title2 as="h1" className={styles.heading}>Microsoft Graph Permissions Explorer</Title2>
        <Body1>Explore official Microsoft Graph permission definitions in the global cloud.</Body1>
        <Caption1>{hostLabel} · Read-only catalog · Stage 1 foundation</Caption1>
        <div role="status" aria-live="polite">
          {!response && !error && <Spinner label="Connecting to catalog API" />}
          {response?.dataState === 'not-imported' && <div className={styles.notice}><Body1><strong>No catalog imported yet.</strong> The API is connected. Data import and catalog browsing are delivered in the next stages.</Body1></div>}
          {response?.dataState === 'ready' && <Body1>Catalog connected: {response.items.length} resource(s). Browsing is available in a later stage.</Body1>}
        </div>
        {error && <MessageBar intent="error"><MessageBarBody>Catalog API error: {error} <Button onClick={() => setAttempt(value => value + 1)}>Retry</Button></MessageBarBody></MessageBar>}
        <Caption1>Source snapshot is versioned in the repository. No live Graph requests or tenant grants are used.</Caption1>
      </main>
    </div>
  </FluentProvider>;
}
