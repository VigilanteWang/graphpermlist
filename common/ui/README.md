# Common UI · `@graph/ui`

`@graph/ui` 是 Permissions Explorer 三个前端共用的 UI。前端通过 `CatalogClient` 提供 permission 数据，可以通过 HTTP API 读取 SQLite 数据库，也可以从 JSON 文件读取。

## 前端入口

| 入口 | 数据来源 | 接入状态 |
| --- | --- | --- |
| [独立 Web](../../apps/web/src/main.tsx) | NestJS HTTP API | 已接入 |
| [API 版 SPFx Web Part](../../apps/spfx/src/webparts/permissionsExplorer/PermissionsExplorerWebPart.ts) | NestJS HTTP API | 已接入 |
| JSON 版 SPFx Web Part | SharePoint 文档库中的版本化 JSON，下载后在浏览器中查询 | JSON client 已有，独立 Web Part 和第三入口由 [#14](https://github.com/VigilanteWang/graphpermlist/issues/14) 接入 |

## 界面功能

- **Home** 显示目录来源、导入信息和统计，并提供各资源的 API permission 定义。
- 每个资源页面按分类规则显示 category 卡片，进入某个 category 后按 family 分组。导航也预留了 Power BI API 和 SharePoint API 的入口，可用于扩展这两类 API 的 permission 展示，目前均标为 **Coming soon**。
- **筛选框** 在 category 卡片页和 permission 列表页共用同一份搜索和筛选条件。进入 category 会缩小查询范围，返回时仍保留这些条件。
- **permission 列表与 details**分别展示匹配当前筛选的定义和该 permission 的全部定义。details 面板支持复制名称和 GUID。

## 组件与 Hook 架构

```mermaid
flowchart LR
    Shell["ExplorerShell"]
    Shell --> Nav["ResourceNavigation"]
    Shell --> Home["HomePage"]
    Shell --> Toolbar["CatalogToolbar"]
    Shell --> Content["CatalogContent"]
    Shell --> Detail["DetailsPanel"]
    Shell -.-> Controller["useExplorerController"]

    Content --> Cards["CategoryCards"]
    Content --> Families["FamilyPermissions"]
    Families --> Grid["PermissionGrid"]

    Controller -.-> Layout["useExplorerLayout"]
    Controller -.-> Catalog["useExplorerCatalog"]
    Controller -.-> Browse["useFamilyBrowse"]
    Catalog -.->|"每路查询各调用一次"| Request["useCatalogRequest"]

    Detail -.-> DetailRequest["usePermissionDetails"]
    Detail --> Copy["CopyValue"]
    Copy -.-> CopyState["useCopyValue"]

    classDef component fill:#dbeafe,stroke:#1d4ed8,color:#172554
    classDef hook fill:#f3e8ff,stroke:#7e22ce,color:#3b0764
    class Shell,Nav,Home,Toolbar,Content,Detail,Cards,Families,Grid,Copy component
    class Controller,Layout,Catalog,Browse,Request,DetailRequest,CopyState hook
```

<sub>蓝色为 React 组件，紫色为自定义 Hook。实线表示渲染子组件，虚线表示调用 Hook。</sub>

### 组件职责

| 组件 | 做什么 |
| --- | --- |
| [`ExplorerShell`](src/explorer/ExplorerShell/ExplorerShell.tsx) | 共享 UI 的入口，组合导航、首页和资源浏览页面。 |
| [`ResourceNavigation`](src/explorer/ExplorerShell/components/ResourceNavigation.tsx) | 在 Home 和各 API 资源入口之间导航。 |
| [`HomePage`](src/explorer/HomePage/HomePage.tsx) | 显示统计、资源卡片、使用说明和数据来源。 |
| [`CatalogToolbar`](src/explorer/components/CatalogToolbar.tsx) | 显示当前筛选条件，并把用户修改交给 `updateCriteria`。 |
| [`CatalogContent`](src/explorer/ExplorerShell/components/CatalogContent.tsx) | 浏览已接入的 API 资源时，显示 [`CategoryCards`](src/explorer/ExplorerShell/components/CategoryCards.tsx) 或 [`FamilyPermissions`](src/explorer/ExplorerShell/components/FamilyPermissions.tsx)。目前可浏览 Microsoft Graph，Power BI 和 SharePoint 是预留入口。 |
| [`CategoryCards`](src/explorer/ExplorerShell/components/CategoryCards.tsx)、[`FamilyPermissions`](src/explorer/ExplorerShell/components/FamilyPermissions.tsx)、[`PermissionGrid`](src/permissions/PermissionGrid/PermissionGrid.tsx) | 分别显示 category 卡片、可展开的 family 分组和 permission 表格。 |
| [`DetailsPanel`](src/permissions/DetailsPanel/DetailsPanel.tsx)、[`DefinitionDetails`](src/permissions/DetailsPanel/components/DefinitionDetails.tsx)、[`CopyValue`](src/permissions/DetailsPanel/components/CopyValue.tsx) | 展示选中 permission 的完整定义，并提供名称和 GUID 的复制操作。 |
| [`DefinitionLabel`](src/permissions/components/DefinitionLabel.tsx)、[`MetadataTable`](src/components/MetadataTable.tsx)、[`RequestError`](src/components/RequestError.tsx) | 提供可复用的定义标签、元数据表和请求错误提示。 |

### Hook 与数据访问

| Hook 或接口 | 做什么 |
| --- | --- |
| [`useExplorerController`](src/explorer/ExplorerShell/hooks/useExplorerController.ts) | 管理页面、当前 category、筛选条件和键盘焦点，把数据和操作交给 [`ExplorerShell`](src/explorer/ExplorerShell/ExplorerShell.tsx)。 |
| [`useExplorerLayout`](src/explorer/ExplorerShell/hooks/useExplorerLayout.ts) | 观察 [`ExplorerShell`](src/explorer/ExplorerShell/ExplorerShell.tsx) 的容器宽度，判断是否需要窄布局。 |
| [`useExplorerCatalog`](src/explorer/ExplorerShell/hooks/useExplorerCatalog.ts) | 根据当前页面和筛选条件准备各路查询，并整理 family 选项。 |
| [`useCatalogRequest`](src/hooks/useCatalogRequest.ts) | 执行传入的查询函数，处理加载、失败、取消和重试。 |
| [`useFamilyBrowse`](src/explorer/ExplorerShell/hooks/useFamilyBrowse.ts) | 按 family 分组并保存展开状态。 |
| [`usePermissionDetails`](src/permissions/DetailsPanel/hooks/usePermissionDetails.ts)、[`useCopyValue`](src/permissions/DetailsPanel/hooks/useCopyValue.ts) | 分别加载选中 permission 的详情、管理复制结果。 |
| [`CatalogClient`](../contracts/src/catalog-query.ts) | UI 统一使用的查询接口。HTTP client 通过后端 API 查询 SQLite，JSON client 在浏览器中查询已加载的快照。 |

## 页面如何更新

以在某个 category 内输入 `mail` 为例：

```mermaid
flowchart TD
    Shell["ExplorerShell<br/>渲染筛选框"]
    Toolbar["CatalogToolbar<br/>用户输入 mail"]
    Controller["useExplorerController<br/>更新 criteria，组装 query"]
    Catalog["useExplorerCatalog<br/>准备查询函数"]
    Request["useCatalogRequest<br/>Effect 调用查询函数，保存结果"]
    Browse["useFamilyBrowse<br/>按 family 分组"]
    Content["ExplorerShell<br/>显示更新后的内容"]

    Shell --> Toolbar
    Toolbar -->|"调用 updateCriteria"| Controller
    Controller -->|"重新渲染时传入 query"| Catalog
    Catalog --> Request
    Request -->|"查询完成后重新渲染"| Browse
    Browse --> Content
```

1. **用户输入**。在 `CatalogToolbar` 输入 `mail`，筛选框调用 `updateCriteria({ q: 'mail' })`。
2. **组装查询**。`useExplorerController` 更新 `criteria`。重新渲染时，它结合当前 `category` 生成新 `query`。
3. **执行查询**。`useExplorerCatalog` 准备新的查询函数。渲染提交后，`useCatalogRequest` 的 Effect 调用该函数，通过 `CatalogClient` 查询数据。
4. **显示结果**。请求完成后保存结果并触发渲染。`useFamilyBrowse` 对返回的 permission 行分组并展开命中项，`ExplorerShell` 把结果交给内容区显示。

## 常用名词与查询结果

| 名称 | 含义与用途 |
| --- | --- |
| `criteria` | 筛选框保存的条件，例如搜索词、permission 类型、family 和是否显示禁用项。 |
      | `category` | 此项目为 permission 划分的大类。比如Directory，SharePoint。  |
| `family` | category 内的分组，例如 `Mail`。每组可以展开查看其中的 permission。 |
| `query` | 结合 `criteria` 和当前 `category` 得到的查询参数。 |
| `catalog` | 此处指 `useExplorerCatalog` 返回给页面的查询状态和派生数据。 |
| `resources` | API 资源列表和目录状态，用于 Home 和定位 Microsoft Graph resource。 |
| `categories` | category 列表和计数，用于显示分类卡片。 |
| `rows` | 当前 category 中符合查询条件的 permission 行，用于 family 分组和表格。 |
| `familySource` | 包含禁用项的 permission 查询结果，用于生成独立于当前筛选的 family 选项，也供 Home 统计使用。 |

## 接入与验证

前端应用创建好 `client` 后，从公开入口导入并挂载 `ExplorerShell`。独立网站通过 `viewportLayout` 启用视口布局。SPFx 使用默认的嵌入布局，也可以通过 props 提供主题或主题模式。

```tsx
import { ExplorerShell } from '@graph/ui';

<ExplorerShell client={client} hostLabel="Standalone website" viewportLayout />
```

