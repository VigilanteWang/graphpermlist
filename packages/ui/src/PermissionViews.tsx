/** permission 列表和详情的共享 React 视图；官方文案只取自目录定义，不生成摘要。 */
import * as React from 'react';
import {
  Badge, Button, Caption1, DataGrid, DataGridBody, DataGridCell, DataGridHeader,
  DataGridHeaderCell, DataGridRow, Drawer, DrawerBody, DrawerHeader, DrawerHeaderTitle,
  Input, MessageBar, MessageBarBody, Spinner, Text, createTableColumn, makeStyles, tokens
} from '@fluentui/react-components';
import type { CatalogClient } from '@graph/contracts';
import type { PermissionDefinition, PermissionDetailResponse, PermissionQuery, PermissionRow } from '@graph/contracts';

// 生成的类名只作用于当前组件；长文案换行，表格在窄容器中提供局部横向滚动。
const useStyles = makeStyles({
  scroll: { overflowX: 'auto', width: '100%', minWidth: '0' },
  grid: { minWidth: '960px' },
  cell: { minWidth: '0', alignItems: 'flex-start', overflowWrap: 'anywhere', paddingTop: tokens.spacingVerticalM, paddingBottom: tokens.spacingVerticalM },
  stack: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, minWidth: '0' },
  labels: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalXS, alignItems: 'center' },
  definition: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  name: { whiteSpace: 'normal', overflowWrap: 'anywhere', textAlign: 'left', justifyContent: 'flex-start', height: 'auto' },
  // 自定义 portal 容器时 Fluent 默认 absolute；详情仍须相对于视口定位。
  backdrop: { position: 'fixed' },
  // 百分比上限遵守 modal 滚动锁预留的滚动条宽度，避免窄屏左侧被裁切。
  drawer: { position: 'fixed', width: 'min(592px, 100vw)', maxWidth: '100%', boxSizing: 'border-box' },
  body: { minWidth: '0', overflowWrap: 'anywhere', paddingBottom: tokens.spacingVerticalL },
  section: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, padding: tokens.spacingHorizontalM, borderRadius: tokens.borderRadiusMedium, backgroundColor: tokens.colorNeutralBackground2 },
  list: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: tokens.spacingVerticalS, margin: '0' },
  term: { fontWeight: tokens.fontWeightSemibold },
  value: { margin: '0', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
  copy: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS, minWidth: '0' },
  muted: { color: tokens.colorNeutralForeground3 }
});

/** permission 列表组件的属性，rows 仅包含命中筛选的定义，onOpen 接收 permission value。 */
export interface PermissionGridProps { rows: PermissionRow[]; onOpen: (value: string) => void; }

/** 单条定义的类型与状态标签；同类型多 GUID 时显示 GUID 以消除字段归属歧义。 */
function DefinitionLabel({ definition, showId = false }: { definition: PermissionDefinition; showId?: boolean }): React.ReactElement {
  const styles = useStyles();
  return <div className={styles.labels}>
    <Badge appearance="tint" color={definition.permissionType === 'Application' ? 'brand' : 'success'}>{definition.permissionType}</Badge>
    {!definition.isEnabled && <Badge appearance="outline" color="warning">Disabled</Badge>}
    {showId && <Caption1 className={styles.muted}>{definition.id}</Caption1>}
  </div>;
}

/** 列表中的官方字段视图，逐条保留 definitions，避免同类型的不同 GUID 文案被覆盖。 */
function DefinitionField({ row, field }: { row: PermissionRow; field: 'title' | 'description' | 'adminConsentRequired' }): React.ReactElement {
  const styles = useStyles();
  return <div className={styles.stack}>{row.definitions.map(definition => <div key={`${definition.permissionType}:${definition.id}`} className={styles.definition}>
    <DefinitionLabel definition={definition} showId={row.definitions.filter(item => item.permissionType === definition.permissionType).length > 1} />
    <span>{field === 'adminConsentRequired' ? (definition.adminConsentRequired ? 'Yes' : 'No') : definition[field]}</span>
  </div>)}</div>;
}

/** 基于 Fluent DataGrid 的 permission 列表；全部字段和类型标签均从当前 definitions 读取。 */
export function PermissionGrid({ rows, onOpen }: PermissionGridProps): React.ReactElement {
  const styles = useStyles();
  const columns = [
    createTableColumn<PermissionRow>({ columnId: 'permission', renderHeaderCell: () => 'Permission', renderCell: row => <Button appearance="transparent" className={styles.name} onClick={() => onOpen(row.value)}>{row.value}</Button> }),
    createTableColumn<PermissionRow>({ columnId: 'summary', renderHeaderCell: () => 'Summary', renderCell: row => <DefinitionField row={row} field="title" /> }),
    createTableColumn<PermissionRow>({ columnId: 'message', renderHeaderCell: () => 'Consent message', renderCell: row => <DefinitionField row={row} field="description" /> }),
    createTableColumn<PermissionRow>({ columnId: 'admin', renderHeaderCell: () => 'Admin consent required', renderCell: row => <DefinitionField row={row} field="adminConsentRequired" /> }),
    createTableColumn<PermissionRow>({ columnId: 'types', renderHeaderCell: () => 'Permission types', renderCell: row => <div className={styles.stack}>{row.definitions.map(definition => <DefinitionLabel key={`${definition.permissionType}:${definition.id}`} definition={definition} showId={row.definitions.filter(item => item.permissionType === definition.permissionType).length > 1} />)}</div> })
  ];
  return <div className={styles.scroll}>
    <DataGrid className={styles.grid} items={rows} columns={columns} getRowId={row => `${row.resourceId}:${row.value}`} aria-label="Permissions" focusMode="composite">
      <DataGridHeader><DataGridRow>{({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}</DataGridRow></DataGridHeader>
      <DataGridBody<PermissionRow>>{({ item, rowId }) => <DataGridRow<PermissionRow> key={rowId}>{({ renderCell, columnId }) => <DataGridCell className={styles.cell} focusMode={columnId === 'permission' ? 'group' : 'cell'}>{renderCell(item)}</DataGridCell>}</DataGridRow>}</DataGridBody>
    </DataGrid>
  </div>;
}

/** Clipboard 控件的属性，label 是按钮及手动复制输入框的英文名称。 */
interface CopyValueProps { value: string; label: string; }

/** Clipboard 复制控件；只有 writeText 成功才显示成功，失败时提供可全选的只读输入框。 */
function CopyValue({ value, label }: CopyValueProps): React.ReactElement {
  const styles = useStyles();
  const [status, setStatus] = React.useState<'idle' | 'copying' | 'copied' | 'failed'>('idle');
  /** 当前文本的 Clipboard 写入操作，浏览器拒绝或不支持时转为手动复制提示。 */
  async function copy(): Promise<void> {
    // 不禁用原生按钮，避免 Clipboard Promise 等待期间丢失键盘焦点。
    if (status === 'copying') return;
    setStatus('copying');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      setStatus('copied');
    } catch { setStatus('failed'); }
  }
  return <div className={styles.copy}>
    <Button size="small" aria-disabled={status === 'copying'} onClick={() => { void copy(); }}>Copy {label}</Button>
    <span role="status">{status === 'copied' ? `${label} copied.` : status === 'failed' ? 'Copy failed. Select the text below and copy it manually.' : ''}</span>
    {status === 'failed' && <Input aria-label={`${label} for manual copy`} readOnly value={value} onFocus={event => event.target.select()} />}
  </div>;
}

/** 完整定义详情的展示组件；包含官方原文、admin consent 规则和 Delegated 专有字段。 */
function DefinitionDetails({ definition }: { definition: PermissionDefinition }): React.ReactElement {
  const styles = useStyles();
  return <section className={styles.section} aria-label={`${definition.permissionType} ${definition.id}`}>
    <DefinitionLabel definition={definition} />
    <dl className={styles.list}>
      <dt className={styles.term}>GUID</dt><dd className={styles.value}>{definition.id}<CopyValue value={definition.id} label="GUID" /></dd>
      <dt className={styles.term}>Summary (official title)</dt><dd className={styles.value}>{definition.title}</dd>
      <dt className={styles.term}>Consent message</dt><dd className={styles.value}>{definition.description}</dd>
      <dt className={styles.term}>Admin consent required</dt><dd className={styles.value}>{definition.adminConsentRequired ? 'Yes (Required)' : 'No (Not required)'}</dd>
      <dt className={styles.term}>Admin consent rule</dt><dd className={styles.value}>{definition.adminConsentRule}</dd>
      <dt className={styles.term}>Enabled</dt><dd className={styles.value}>{definition.isEnabled ? 'Yes' : 'No (disabled)'}</dd>
      {definition.permissionType === 'Delegated' && <>
        <dt className={styles.term}>Consent type</dt><dd className={styles.value}>{definition.consentType}</dd>
        <dt className={styles.term}>User consent title</dt><dd className={styles.value}>{definition.userConsentTitle}</dd>
        <dt className={styles.term}>User consent description</dt><dd className={styles.value}>{definition.userConsentDescription}</dd>
      </>}
    </dl>
  </section>;
}

/** permission 详情面板的属性；mountNode 可让宿主把 portal 放在 FluentProvider 的局部容器中。 */
export interface DetailsPanelProps {
  client: CatalogClient;
  resourceId: string;
  value: string | undefined;
  query: PermissionQuery;
  onClose: () => void;
  mountNode?: HTMLElement | null;
}

/** 详情请求的状态结构，通过请求键阻止上一次 permission 的内容出现在新面板中。 */
interface DetailState { key: string; response?: PermissionDetailResponse; error?: string; }

/** Fluent modal Drawer 详情面板；支持取消、过时结果隔离、Retry，以及全部定义的完整展示。 */
export function DetailsPanel({ client, resourceId, value, query, onClose, mountNode }: DetailsPanelProps): React.ReactElement {
  const styles = useStyles();
  const [attempt, setAttempt] = React.useState(0);
  const [state, setState] = React.useState<DetailState>();
  // 采用稳定的参数序列，父组件每次创建等值 query 对象时不会重复请求。
  const queryKey = JSON.stringify([query.q, query.category, query.family, query.permissionType, query.adminConsentRequired, query.showDisabled]);
  const requestKey = JSON.stringify([resourceId, value, queryKey, attempt]);
  React.useEffect(() => {
    if (value === undefined) return;
    const abort = new AbortController();
    const [q, category, family, permissionType, adminConsentRequired, showDisabled] = JSON.parse(queryKey) as [PermissionQuery['q'], PermissionQuery['category'], PermissionQuery['family'], PermissionQuery['permissionType'], PermissionQuery['adminConsentRequired'], PermissionQuery['showDisabled']];
    // JSON 数组中的 undefined 会变成 null；还原成 API 的可选字段语义。
    const snapshot: PermissionQuery = { q: q ?? undefined, category: category ?? undefined, family: family ?? undefined, permissionType: permissionType ?? undefined, adminConsentRequired: adminConsentRequired ?? undefined, showDisabled: showDisabled ?? undefined };
    setState({ key: requestKey });
    client.detail(resourceId, value, snapshot, abort.signal).then(response => {
      if (!abort.signal.aborted) setState({ key: requestKey, response });
    }).catch((error: unknown) => {
      if (!abort.signal.aborted) setState({ key: requestKey, error: error instanceof Error ? error.message : 'Permission details are unavailable.' });
    });
    return () => abort.abort();
  }, [client, resourceId, value, queryKey, requestKey]);
  const current = state?.key === requestKey ? state : undefined;
  return <Drawer aria-label={`${value ?? 'Permission'} details`} type="overlay" modalType="modal" open={value !== undefined} position="end" size="medium" mountNode={mountNode} backdrop={{ className: styles.backdrop }} className={styles.drawer} onOpenChange={(_, data) => { if (!data.open) onClose(); }}>
    <DrawerHeader><DrawerHeaderTitle action={<Button appearance="subtle" onClick={onClose} aria-label="Close details">Close</Button>}>Permission details</DrawerHeaderTitle></DrawerHeader>
    <DrawerBody className={styles.body}>
      <div className={styles.stack}>
        <Text weight="semibold">{value}</Text>
        {value !== undefined && <CopyValue key={value} value={value} label="permission name" />}
        <Text>Details include all definitions, including definitions that do not match the current filters and disabled definitions.</Text>
        {!current?.response && !current?.error && <Spinner label="Loading permission details" />}
        {current?.error && <MessageBar intent="error"><MessageBarBody>{current.error} <Button onClick={() => setAttempt(previous => previous + 1)}>Retry</Button></MessageBarBody></MessageBar>}
        {current?.response?.allDefinitions.map(definition => <DefinitionDetails key={`${definition.permissionType}:${definition.id}`} definition={definition} />)}
      </div>
    </DrawerBody>
  </Drawer>;
}
