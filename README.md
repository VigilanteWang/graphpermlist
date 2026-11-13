# Microsoft Graph Permissions Explorer

## 项目介绍

Microsoft Graph Permissions Explorer 是一个面向 Microsoft Graph 全球云权限目录的只读应用，以仓库中的权限定义快照作为数据输入，不在线采集租户数据，也不执行权限授予或撤销。

- **独立网站前端**：Vite + React + TypeScript，可在浏览器中独立运行。
- **SharePoint 前端**：SPFx Web Part，可打包为 SharePoint 解决方案；与独立网站共用界面组件、数据类型和 API client。
- **共享界面**：Fluent UI React v9，React 18.3.1；提供目录 API 连接状态、未导入提示和错误重试。
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
│   │   │   ├── app.module.ts             组装应用模块
│   │   │   ├── bootstrap.ts              API 前缀、参数校验和 CORS
│   │   │   ├── configuration.ts          环境变量读取与校验
│   │   │   ├── catalog/                  目录路由、业务服务和查询参数 DTO
│   │   │   └── database/                 TypeORM / SQLite 连接配置
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
├── packages/
│   ├── ui/src/index.tsx                  两个前端共用的 Fluent UI 界面
│   ├── api-client/src/index.ts           HTTP 请求、查询参数和错误处理
│   └── contracts/src/index.ts            前后端共用的 API 数据类型
├── data/
│   ├── commercial-graph-permlist.json    版本化的安全权限快照
│   └── README.md                         数据来源、字段说明和校验值
├── docs/
│   ├── api-contract.md                   API 请求、响应及错误语义
│   ├── implementation-plan.md            实施计划与交接说明
│   └── verification/                     验证记录与截图
├── scripts/
│   ├── verify-data.mjs                   数据结构和快照完整性检查
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
```

**终端 1：启动后端，保持运行。**

```sh
npm run start:api
```

**终端 2：启动独立网站，保持运行。**

```sh
npm run dev:web
```

打开 [http://localhost:5173](http://localhost:5173)。页面显示 **No catalog imported yet.** 表示已连接 API，但没有已导入的目录。启动命令不会自动导入 JSON；当前不提供完整权限列表、搜索和详情浏览。

后端健康检查：[http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)。在两个终端分别按 `Ctrl+C` 停止服务。

默认配置即可本地运行。如需调整，复制根目录 `.env.example` 为 `.env`，设置端口、CORS 来源和 SQLite 路径；复制 `apps/web/.env.example` 为 `apps/web/.env.local`，设置 `VITE_API_BASE_URL`，然后重启相应服务。使用默认配置时，请通过 `localhost:5173` 访问网站。

**构建独立网站和 SharePoint 解决方案：**

```sh
npm run build
```

独立网站输出到 `apps/web/dist/`，SharePoint 包输出到 `apps/spfx/sharepoint/solution/graph-permissions-explorer.sppkg`。构建不会自动部署；在 SharePoint 中运行还需要部署到 App Catalog，并为 Web Part 配置可访问的 HTTPS API 地址和对应 CORS 来源。
