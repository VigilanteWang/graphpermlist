# Microsoft Graph Permissions Explorer

## 项目介绍

Microsoft Graph Permissions Explorer 是一个全球云只读权限目录，默认覆盖 Microsoft Graph、Power BI Service 和 SharePoint Online，以仓库中的脱敏权限定义快照作为数据输入，不在线采集租户数据，也不执行权限授予或撤销。

- **独立网站前端**：Vite + React + TypeScript，可在浏览器中独立运行。
- **SharePoint 前端**：SPFx Web Part，可打包为 SharePoint 解决方案；与独立网站共用界面组件、中立数据类型及前端注入的 HTTP client。
- **共享界面**：Fluent UI React v9，React 18.3.1；提供英文 Home、分类卡片、搜索筛选、family DataGrid 和完整详情。
- **后端**：NestJS，使用默认 Express adapter，通过 HTTP API 为前端提供数据。
- **数据库**：TypeORM + better-sqlite3，本地运行无需单独安装数据库服务或 Docker。
- **数据输入**：`data/commercial-graph-permlist.json`，保留权限定义及独立的 RSC 集合；来源说明见 `data/README.md`。

## 文件夹结构和关键文件

```text
graphpermlist/
├── apps/
│   ├── api/                              NestJS 后端
│   │   ├── src/
│   │   │   ├── main.ts                   启动 HTTP 服务
│   │   │   ├── catalog-cli.ts            离线迁移与数据导入
│   │   │   ├── app.module.ts             组装应用模块
│   │   │   ├── bootstrap.ts              API 前缀、参数校验和 CORS
│   │   │   ├── configuration.ts          环境变量读取与校验
│   │   │   ├── catalog/                  目录路由、实体、查询服务与 load/ 下的 SQLite 写入
│   │   │   └── database/                 TypeORM / SQLite 配置与版本化迁移
│   │   └── tsconfig.json                 后端 TypeScript 配置
│   ├── web/                              Vite 独立网站
│   │   ├── src/main.tsx                  创建 React 根节点，加载共享界面
│   │   ├── index.html                    网站 HTML 入口
│   │   ├── vite.config.ts                网站构建配置
│   │   └── .env.example                  前端 API 地址配置示例
│   └── spfx/                             SharePoint Web Part
│       ├── src/webparts/permissionsExplorer/
│       │   ├── PermissionsExplorerWebPart.ts
│       │   │                             生命周期、属性面板和 React 接入
│       │   └── PermissionsExplorerWebPart.manifest.json
│       │                                 组件标识、显示信息和默认属性
│       └── config/
│           ├── config.json               组件入口与打包配置
│           ├── package-solution.json     Solution 标识、版本和包输出设置
│           ├── rig.json                  官方 SPFx Heft 工具链配置入口
│           └── serve.json                SPFx 开发服务配置
├── common/
│   ├── contracts/                       中立 client、查询、数据模型和传输契约
│   └── ui/                              两个前端共用的 Fluent UI 界面
├── catalog/
│   ├── api-client/                      HTTP 请求、查询参数和错误处理
│   ├── json-client/                     从宿主加载快照，在内存查询
│   ├── json-format/                     浏览器与离线工具共用的 JSON 校验
│   ├── query/                           纯查询规则（@graph/catalog-core）
│   └── etl/src/
│       ├── extract/                     Node 输入读取、校验和脱敏
│       ├── transform/                   SQLite 和 JSON 共用的纯建模与分类
│       └── export/                      离线导出和校验 JSON 发布文件
├── data/
│   ├── catalog-resources.json           三个默认 resource 和源文件校验值
│   ├── commercial-*-permlist.json       脱敏 permission 快照
│   └── README.md                         数据来源、字段说明和校验值
├── docs/
│   ├── api-contract.md                   API 请求、响应及错误语义
│   ├── catalog-operations.md             迁移、导入与 API 示例
│   ├── classification.md                 分类规则、依据和未分类项
│   ├── implementation-plan.md            实施计划与交接说明
│   └── verification/                     验证记录与截图
├── scripts/
│   └── check-boundaries.mjs              React 依赖与共享代码边界检查
├── tests/                                API、客户端、数据和浏览器测试
│   └── fixtures/                         仅供测试的契约样例
├── package.json                          npm workspaces、依赖和命令入口
├── package-lock.json                     锁定依赖版本
├── tsconfig.base.json                    共享 TypeScript 配置
├── playwright.config.ts                  浏览器测试配置
├── .nvmrc / .node-version                Node.js 版本
├── .npmrc                                npm 安装规则
├── .env.example                          后端环境变量配置示例
├── .gitignore                            排除依赖、构建产物和本地数据库
└── AGENTS.md                             Coding agent 项目指引
```

## 快速安装和运行

使用 **Node.js 22.16.0、npm 10.9.2**。以下命令均从仓库根目录执行，无需全局安装 SPFx 或 Heft CLI。如果 SQLite 原生模块无法下载预编译文件，需要本机提供 Python 3 和 C/C++ 编译工具。

**安装依赖并编译运行所需代码：**

```sh
npm ci
npm run verify:data
npm run build:shared
npm run build:api
npm run db:migrate
npm run import:data
```

**终端 1：启动后端，保持运行。**

```sh
npm run start:api
```

**终端 2：启动独立网站，保持运行。**

```sh
npm run dev:web
```

打开 [http://localhost:5173](http://localhost:5173)。首页显示各 resource 的 permission 行数和 definition 数量，展开对应的 **catalog data details** 查看来源、导入时间、分类版本和 RSC 排除数。Microsoft Graph 先选 category，再浏览 family。Power BI Service 和 SharePoint Online 直接按 family 浏览。切换资源保留搜索、类型、admin consent 和禁用项筛选，并清除 category、family 筛选和详情。若未执行导入，页面显示 **No catalog imported yet.**。启动服务不会自动迁移或导入；操作说明与请求示例见 [目录操作](docs/catalog-operations.md)。完整交互、键盘、HTTPS/CORS 和两个前端的配置见 [共享 UI 开发与验收](docs/ui-development.md)。

后端健康检查：[http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)。在两个终端分别按 `Ctrl+C` 停止服务。

默认配置即可本地运行。如需调整，复制根目录 `.env.example` 为 `.env`，设置端口、CORS 来源和 SQLite 路径；复制 `apps/web/.env.example` 为 `apps/web/.env.local`，设置 `VITE_API_BASE_URL`，然后重启相应服务。使用默认配置时，请通过 `localhost:5173` 访问网站。

**构建独立网站和 SharePoint 解决方案：**

```sh
npm run build
```

独立网站输出到 `apps/web/dist/`，SharePoint 包输出到 `apps/spfx/sharepoint/solution/graph-permissions-explorer.sppkg`。构建不会自动部署；在 SharePoint 中运行还需要部署到 App Catalog，并为 Web Part 配置可访问的 HTTPS API 地址和对应 CORS 来源。

## 离线生成 JSON 目录

```sh
npm run export:json -- --output ./release/catalog
npm run verify:json -- --output ./release/catalog
```

默认从三份脱敏源生成 schema 2 快照 `catalog-<version>.json` 和版本指针 `current.json`，无需启动 API 或打开 SQLite。JSON CatalogClient 由前端注入文件 loader，查询时复用已校验的会话快照。现有网站和 API 版 SPFx 继续使用 HTTP API。显式设置 `PERMISSIONS_SOURCE` 可生成兼容用的 Graph schema 1。网站及单一 SPFx 的配置选源和 schema 1 退役条件见 [#14](https://github.com/VigilanteWang/graphpermlist/issues/14)。生成、校验、人工发布与回退步骤见 [目录操作](docs/catalog-operations.md#offline-json-publication)。

## 本地验证与交付状态

完成安装后，从仓库根目录运行：

```sh
npm run typecheck
npm test
npm run build
npm run check:react
npx playwright install chromium
npm run test:browser
```

默认开发端口已占用时，使用 `CATALOG_TEST_API_PORT=3216 CATALOG_TEST_WEB_PORT=5316 npm run test:browser`。浏览器测试启动独立 API/Vite，并将真实快照导入隔离内存数据库，不复用本地 SQLite。手工评审时可设置 `SQLITE_PATH=./var/review.sqlite`，迁移、导入和 API 启动必须使用同一路径。

阶段 [PR #7](https://github.com/VigilanteWang/graphpermlist/pull/7)、[PR #8](https://github.com/VigilanteWang/graphpermlist/pull/8)、[PR #9](https://github.com/VigilanteWang/graphpermlist/pull/9) 已合入 main。最终独立审查、#2 逐项验收、干净安装回归及修复见[阶段 4 交付记录](docs/verification/phase-4.md)，人工操作见[交付审查清单](docs/verification/phase-4-human-review.md)。

**当前为本地 Demo 与两个前端的构建与打包交付。实际 SharePoint 页面及两个前端使用相同数据的对比仍待授权测试环境；#2 尚未全部验收，未部署。** Heft 没有 Web Part 专属 Jest 套件；其他目标浏览器版本、平台及 hosted CI 未验证。

## TypeScript 与浏览器兼容基线

根 `tsconfig.base.json` 提供通用类型检查选项和 ES2020 语法基线；模块规则由各 workspace 明确选择，SPFx 单独继承官方 rig。

| 范围 | module / moduleResolution | target | 实际模块格式 |
| --- | --- | --- | --- |
| API | NodeNext / NodeNext | ES2020 | `apps/api/package.json` 显式 `type: commonjs`，输出 CommonJS，由 Node 直接执行 |
| contracts、api-client、ui | NodeNext / NodeNext | ES2020 | 各包保留 `type: module`，输出 ESM 与类型声明 |
| query、ingest、catalog-json、json-client | NodeNext / NodeNext；另编译 CommonJS / Node | ES2020 | 单一源码生成 ESM/CJS，条件出口供浏览器和现有 Node API 使用 |
| Web | ESNext / Bundler | ES2022 | TypeScript 只检查类型，Vite 构建浏览器产物 |
| 测试夹具 | NodeNext / NodeNext | ES2020 | 只做类型检查，不输出代码 |
| SPFx | ESNext / node（官方 rig） | ES5 | Heft 额外输出 CommonJS，Webpack 负责打包 |

Web 在 `vite.config.ts` 显式保留 Chrome 107、Edge 107、Firefox 104、Safari 16 的构建目标；这与 TypeScript 的 ES2022 target 分开管理。Web 的 `lib` 仍为 ES2020 / DOM，避免仅因提高语法目标而开放更多内置 API 类型。`lib` 不提供 polyfill，构建目标也不等于对应浏览器已经完成实测。

共享包使用 NodeNext 检查模块加载规则，以兼容 Node ESM 测试及 Vite/Webpack 消费；新增相对运行时导入时使用输出对应的 `.js` 扩展名。API 对 contracts 使用 type-only imports，不产生运行时 ESM 依赖。不要把 `NodeNext` 等同于 ESM 迁移，也不要直接修改 `node_modules` 中的 SPFx 配置。

阶段 #5 保留这组前端边界，并通过真实导入 API 的 Chromium UI 回归和 Vite/SPFx 构建。真实 SharePoint 页面及其他目标浏览器版本的验收仍需单列，见 [阶段 3 验证](docs/verification/phase-3.md)。配置修改的实际验证结果见[阶段 2 验证补充](docs/verification/phase-2.md#typescript-configuration-follow-up--2026-11-16)。

## SharePoint JSON 增量

父需求 [#11](https://github.com/VigilanteWang/graphpermlist/issues/11) 交付独立网站与一套 SPFx solution、Web Part 和 `.sppkg`。两个宿主通过中立 `CatalogClient` 使用同一份 UI。[#18](https://github.com/VigilanteWang/graphpermlist/issues/18) 已接通三个真实目录及两种 JSON 格式，现有两个宿主继续使用 HTTP。

HTTP 用 `createApiCatalogClient()`，原工厂名保留为别名。离线发布和 `JsonCatalogClient` 共用校验，SQLite 和 JSON 共用纯查询。新增同格式资源可按[数据说明](data/README.md)登记文件和摘要。计划与验证见 [SharePoint JSON 增量](docs/sharepoint-json-plan.md)，实际 SharePoint 运行验收在 #15。
