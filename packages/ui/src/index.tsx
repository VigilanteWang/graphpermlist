/** Vite 与 SPFx 共用的英文 permission 目录界面，管理导航、筛选与浏览状态。 */
import * as React from 'react';
import {
  Accordion, AccordionHeader, AccordionItem, AccordionPanel, Badge, Body1, Button,
  Caption1, Checkbox, Field, FluentProvider, Input, makeStyles, mergeClasses,
  MessageBar, MessageBarBody, Select, Spinner, Title1, Title2, tokens, webDarkTheme, webLightTheme,
  type Theme
} from '@fluentui/react-components';
import type { CatalogClient } from '@graph/api-client';
import type { CategorySummary, PermissionQuery, PermissionRow, PermissionType } from '@graph/contracts';
import { PermissionGrid, DetailsPanel } from './PermissionViews.js';
import { useCatalogRequest } from './useCatalogRequest.js';

const useStyles = makeStyles({
  root: { boxSizing: 'border-box', minWidth: '0', width: '100%', color: tokens.colorNeutralForeground1, backgroundColor: tokens.colorNeutralBackground2, borderRadius: tokens.borderRadiusXLarge, overflowWrap: 'anywhere', fontFamily: tokens.fontFamilyBase },
  layout: { display: 'grid', gridTemplateColumns: '200px minmax(0, 1fr)', minHeight: '680px' },
  narrowLayout: { gridTemplateColumns: 'minmax(0, 1fr)', minHeight: '0' },
  nav: { display: 'flex', flexDirection: 'column', alignSelf: 'start', position: 'sticky', top: '0', gap: '8px', padding: '24px 16px', minWidth: '0' },
  narrowNav: { position: 'static', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', padding: '12px', '& > strong': { gridColumn: '1 / -1' } },
  main: { minWidth: '0', padding: '24px', backgroundColor: tokens.colorNeutralBackground1, borderRadius: tokens.borderRadiusXLarge },
  narrowMain: { padding: '12px' },
  stack: { display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '0' },
  toolbar: { display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '20px', borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, marginBottom: '24px' },
  filters: { display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'end', '& > *': { minWidth: '0', flexGrow: 1 }, '& select': { maxWidth: '100%' } },
  search: { width: '100%', minWidth: '0', boxSizing: 'border-box' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: '14px' },
  card: { display: 'flex', flexDirection: 'column', alignItems: 'start', textAlign: 'left', whiteSpace: 'normal', padding: '20px', gap: '12px', minHeight: '170px', border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: tokens.borderRadiusLarge, backgroundColor: tokens.colorNeutralBackground1, boxShadow: tokens.shadow2 },
  heading: { margin: '0', outlineOffset: '4px' },
  stats: { display: 'flex', flexWrap: 'wrap', gap: '12px' },
  stat: { flex: '1 1 180px', padding: '20px', backgroundColor: tokens.colorNeutralBackground3, borderRadius: tokens.borderRadiusLarge },
  meta: { margin: '0', display: 'grid', gap: '8px', '& dt': { fontWeight: 600 }, '& dd': { margin: '0 0 8px', overflowWrap: 'anywhere' } },
  body: { animationName: { from: { opacity: 0, transform: 'translateX(16px)' }, to: { opacity: 1, transform: 'translateX(0)' } }, animationDuration: '180ms', animationTimingFunction: 'ease-out', '@media (prefers-reduced-motion: reduce)': { animationDuration: '0s', animationName: 'none' } },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  group: { minWidth: '0', '& > div': { minWidth: '0' } }
});

/** 目录共享组件的宿主参数，包含 HTTP client、宿主标识及可选 Fluent theme。 */
export interface ExplorerShellProps { client: CatalogClient; hostLabel: string; theme?: Theme; themeMode?: 'light' | 'dark'; }
/** 一个服务页面的 Accordion 浏览状态；展开项按 category 保存，不缓存搜索条件。 */
interface BrowseState { open: string[]; }

/** API 错误提示组件，允许在原位置重试失败的请求。 */
function RequestError({ error, retry }: { error: string; retry: () => void }): React.ReactElement {
  return <MessageBar intent="error"><MessageBarBody>Catalog API error: {error} <Button onClick={retry}>Retry</Button></MessageBarBody></MessageBar>;
}

/** 两个宿主共用的完整目录组件；宿主只提供配置、主题和 React 生命周期。 */
export function ExplorerShell({ client, hostLabel, theme, themeMode = 'light' }: ExplorerShellProps): React.ReactElement {
  const styles = useStyles();
  const root = React.useRef<HTMLDivElement>(null);
  const heading = React.useRef<HTMLHeadingElement>(null);
  const detailTrigger = React.useRef<HTMLElement | null>(null);
  const categoryTrigger = React.useRef<string>();
  const [narrow, setNarrow] = React.useState(false);
  const [page, setPage] = React.useState<'home' | 'graph'>('home');
  const [category, setCategory] = React.useState<CategorySummary>();
  // 两级页面共享当前条件；进入或返回 category 只改变查询范围。
  const [criteria, setCriteria] = React.useState<PermissionQuery>({});
  const [states, setStates] = React.useState<Record<string, BrowseState>>({});
  const [searchOpen, setSearchOpen] = React.useState<string[]>([]);
  const [detail, setDetail] = React.useState<string>();
  const viewKey = category?.category ?? 'all';
  const browse = states[viewKey] ?? { open: [] };
  const query = React.useMemo(() => ({ ...criteria, category: category?.category }), [criteria, category]);
  const resourcesLoad = React.useCallback((signal: AbortSignal) => client.resources(signal), [client]);
  const resources = useCatalogRequest(resourcesLoad);
  // 固定全球云 Graph Resource App ID，不能使用来源 Service Principal Object ID。
  const graph = resources.data?.items.find(item => item.resourceId === '00000003-0000-0000-c000-000000000000');
  const resourceId = graph?.resourceId ?? '';
  const categoriesLoad = React.useCallback((signal: AbortSignal) => client.categories(resourceId, query, signal), [client, resourceId, query]);
  const rowsLoad = React.useCallback((signal: AbortSignal) => client.permissions(resourceId, query, signal), [client, resourceId, query]);
  const familiesLoad = React.useCallback((signal: AbortSignal) => client.permissions(resourceId, { showDisabled: true }, signal), [client, resourceId]);
  const enabled = page === 'graph' && !!graph;
  const categories = useCatalogRequest(enabled ? categoriesLoad : undefined);
  const rows = useCatalogRequest(enabled && category ? rowsLoad : undefined);
  const familySource = useCatalogRequest(graph ? familiesLoad : undefined);
  const families = React.useMemo(() => [...new Set(familySource.data?.items.filter(row => !category || row.category === category.category).map(row => row.family) ?? [])].sort(), [familySource.data, category]);
  const groups = React.useMemo(() => {
    const result = new Map<string, PermissionRow[]>();
    for (const row of rows.data?.items ?? []) result.set(row.family, [...(result.get(row.family) ?? []), row]);
    return [...result.entries()];
  }, [rows.data]);
  const searching = !!query.q?.trim();
  React.useEffect(() => { if (searching) setSearchOpen(groups.map(([family]) => family)); }, [groups, searching]);
  React.useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => setNarrow(entries[0].contentRect.width < 640));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  React.useEffect(() => {
    // 只在导航时聚焦标题；筛选响应到达时不能夺走搜索框焦点。
    if (page === 'graph' && category) heading.current?.focus();
  }, [page, category]);
  React.useEffect(() => {
    if (page !== 'graph' || category || !categories.data || !categoryTrigger.current) return;
    const button = root.current?.querySelector<HTMLButtonElement>(`[data-category="${categoryTrigger.current}"]`);
    button?.focus();
    categoryTrigger.current = undefined;
  }, [page, category, categories.data]);

  /** 两级页面共用的搜索条件更新函数；关闭详情以免旧行与新筛选混淆。 */
  function updateQuery(patch: Partial<PermissionQuery>): void {
    setDetail(undefined);
    setCriteria(previous => ({ ...previous, ...patch }));
  }
  /** category 导航入口，仅改变搜索范围，不恢复该 category 以前使用的条件。 */
  function openCategory(item: CategorySummary): void {
    categoryTrigger.current = item.category;
    setCategory(item);
  }
  /** 详情关闭回调，把键盘焦点交还给仍存在的 permission 按钮。 */
  function closeDetail(): void {
    setDetail(undefined);
    requestAnimationFrame(() => detailTrigger.current?.isConnected && detailTrigger.current.focus());
  }
  const contentError = categories.error ?? rows.error ?? familySource.error;
  const count = category ? rows.data : categories.data;
  return <FluentProvider ref={root} theme={theme ?? (themeMode === 'dark' ? webDarkTheme : webLightTheme)} className={styles.root} data-testid="explorer-root">
    <div className={mergeClasses(styles.layout, narrow && styles.narrowLayout)}>
      <nav aria-label="Resources" className={mergeClasses(styles.nav, narrow && styles.narrowNav)}>
        <strong>Permissions Explorer</strong>
        <Button appearance={page === 'home' ? 'primary' : 'subtle'} aria-current={page === 'home' ? 'page' : undefined} onClick={() => { setPage('home'); setDetail(undefined); }}>Home</Button>
        <Button appearance={page === 'graph' ? 'primary' : 'subtle'} aria-current={page === 'graph' ? 'page' : undefined} onClick={() => { setPage('graph'); setCategory(undefined); setDetail(undefined); }}>Microsoft Graph</Button>
        <Button disabled>Power BI · Coming soon</Button><Button disabled>SharePoint · Coming soon</Button>
        <Caption1>{hostLabel} · Global cloud · Read-only</Caption1>
      </nav>
      <main className={mergeClasses(styles.main, narrow && styles.narrowMain)}>
        {resources.loading && <Spinner label="Loading catalog" />}
        {resources.error && <RequestError error={resources.error} retry={resources.retry} />}
        {resources.data?.dataState === 'not-imported' && <div role="status"><Title2 as="h1">No catalog imported yet.</Title2><p>Run the offline migration and import commands, then retry.</p><Button onClick={resources.retry}>Retry</Button></div>}
        {resources.data?.dataState === 'ready' && page === 'home' && <div className={styles.stack}>
          <Badge appearance="tint" color="brand">LOCAL PERMISSION CATALOG</Badge>
          <Title1 as="h1" className={styles.heading}>Microsoft Graph Permissions Explorer</Title1>
          <Body1>Explore official permission definitions across Microsoft Graph services. Compare Application and Delegated permissions, consent requirements and complete official wording.</Body1>
          <div className={styles.stats}>
            <div className={styles.stat}><Title2>{graph?.definitionCount ?? 0}</Title2><p>Enabled ordinary definitions</p></div>
            <div className={styles.stat}><Title2>{familySource.data?.definitionCount ?? '…'}</Title2><p>Ordinary definitions include enabled and disabled entries. Use Show disabled in Microsoft Graph to include them.</p></div>
            <div className={styles.stat}><Title2>{resources.data.source?.excludedRscCount ?? 0}</Title2><p>RSC definitions excluded</p></div>
          </div>
          <Button appearance="primary" onClick={() => { setPage('graph'); setCategory(undefined); }}>Browse Microsoft Graph</Button>
          {familySource.error && <RequestError error={familySource.error} retry={familySource.retry} />}
          <Title2 as="h2">About this catalog</Title2>
          <Body1>This is a versioned snapshot of permission definitions, not tenant grants or an API endpoint list. No live Graph requests are made. A tenant's consent policies may further restrict user consent.</Body1>
          <Body1>SharePoint / OneDrive inside Microsoft Graph is a service category. The separate SharePoint resource in navigation is coming soon.</Body1>
          {resources.data.source && <dl className={styles.meta}>
            <dt>Source snapshot</dt><dd>{resources.data.source.fileName}</dd>
            <dt>Imported at (UTC)</dt><dd>{resources.data.source.importedAt}</dd>
            <dt>SHA-256</dt><dd>{resources.data.source.sha256}</dd>
            <dt>Classification version</dt><dd>{resources.data.source.classificationVersion}</dd>
          </dl>}
        </div>}
        {resources.data?.dataState === 'ready' && page === 'graph' && !graph && <p role="status">Microsoft Graph is not available in this imported catalog.</p>}
        {enabled && <>
          <div className={styles.toolbar}>
            <Field label="Search permissions" hint={category ? `Search within ${category.displayName}: name, GUID, official title or consent message.` : 'Search all Microsoft Graph services: name, GUID, official title or consent message.'}>
              <Input className={styles.search} value={criteria.q ?? ''} onChange={(_, data) => updateQuery({ q: data.value })} placeholder="Search name, GUID or official wording" />
            </Field>
            <div className={styles.filters}>
              <Field label="Permission type"><Select value={query.permissionType ?? ''} onChange={(_, data) => updateQuery({ permissionType: (data.value || undefined) as PermissionType | undefined })}><option value="">All</option><option>Delegated</option><option>Application</option></Select></Field>
              <Field label="Admin consent"><Select value={query.adminConsentRequired === undefined ? '' : String(query.adminConsentRequired)} onChange={(_, data) => updateQuery({ adminConsentRequired: data.value === '' ? undefined : data.value === 'true' })}><option value="">All</option><option value="true">Required</option><option value="false">Not required</option></Select></Field>
              <Field label="Permission family"><Select value={query.family ?? ''} onChange={(_, data) => updateQuery({ family: data.value || undefined })}><option value="">All families</option>{families.map(family => <option key={family}>{family}</option>)}</Select></Field>
              <Checkbox label="Show disabled" checked={query.showDisabled ?? false} onChange={(_, data) => updateQuery({ showDisabled: data.checked === true })} />
              <Button disabled={!criteria.q} onClick={() => updateQuery({ q: '' })}>Clear search</Button>
            </div>
          </div>
          <div key={viewKey} className={mergeClasses(styles.stack, styles.body)} data-testid="catalog-body">
            {category && <Button onClick={() => { setCategory(undefined); setDetail(undefined); }}>Back to categories</Button>}
            <h1 ref={heading} tabIndex={-1} className={styles.heading}>{category?.displayName ?? 'Microsoft Graph'}</h1>
            <Body1>{category?.description ?? 'Browse services and discover their permission families.'}</Body1>
            {contentError && <RequestError error={contentError} retry={() => { categories.retry(); rows.retry(); familySource.retry(); }} />}
            {!contentError && (categories.loading || (category && rows.loading)) && <Spinner label="Loading permissions" />}
            {count && !contentError && <div role="status" data-testid="catalog-counts">{count.permissionCount} permissions · {count.definitionCount} definitions</div>}
            {count?.permissionCount === 0 && !contentError && <Body1>No permissions match your search and filters.</Body1>}
            {!category && !contentError && <div className={styles.cards}>{categories.data?.items.map(item => <Button key={item.category} data-category={item.category} aria-label={`Open ${item.displayName}`} className={styles.card} onClick={() => openCategory(item)}>
              <Title2 as="h2">{item.displayName}</Title2><Body1>{item.description}</Body1><Caption1 data-testid={`category-counts-${item.category}`}>{item.permissionCount} permissions · {item.definitionCount} definitions</Caption1>
            </Button>)}</div>}
            {category && rows.data && !contentError && <>
              <div className={styles.actions}><Button onClick={() => searching ? setSearchOpen(groups.map(([family]) => family)) : setStates(previous => ({ ...previous, [viewKey]: { ...browse, open: groups.map(([family]) => family) } }))}>Expand all</Button><Button onClick={() => searching ? setSearchOpen([]) : setStates(previous => ({ ...previous, [viewKey]: { ...browse, open: [] } }))}>Collapse all</Button></div>
              <Accordion multiple collapsible openItems={searching ? searchOpen : browse.open} onToggle={(_, data) => searching ? setSearchOpen(data.openItems as string[]) : setStates(previous => ({ ...previous, [viewKey]: { ...browse, open: data.openItems as string[] } }))}>
                {groups.map(([family, items]) => <AccordionItem value={family} key={family} className={styles.group}><AccordionHeader>{family} ({items.length})</AccordionHeader><AccordionPanel><PermissionGrid rows={items} onOpen={value => { detailTrigger.current = root.current?.ownerDocument.activeElement as HTMLElement; setDetail(value); }} /></AccordionPanel></AccordionItem>)}
              </Accordion>
            </>}
          </div>
          <DetailsPanel client={client} resourceId={resourceId} value={detail} query={query} onClose={closeDetail} mountNode={root.current} />
        </>}
      </main>
    </div>
  </FluentProvider>;
}
