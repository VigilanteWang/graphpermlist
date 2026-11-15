# Project instructions

Read the latest parent issue #2 and current stage issue, then docs/implementation-plan.md.
Work one stage at a time. Use an independent stage branch/PR based on updated main.
Do not merge, close issues, deploy, or start the next stage without authorization.

V1 is a global-cloud, English, read-only local permissions catalog. No login,
live Graph collection, tenant grants, RSC UI, Azure infrastructure or production deployment.
Keep Nest's default Express adapter, TypeORM/better-sqlite3 and synchronize:false.
UI uses Fluent UI v9 and React 18.3.1 peers; host adapters own React roots and configuration.
Shared packages must not import SPFx context or identity clients. Scope styles locally.
Data lives in data/commercial-graph-permlist.json or PERMISSIONS_SOURCE. Never invent
missing input, import fixtures as production data, or commit credentials/local databases.
Code, documentation, fixtures and retained logs must not contain personal data, tenant
identifiers, credentials or personal absolute paths. Public resource/permission IDs are valid.

Use Node from .nvmrc and npm 10.9.2. Run from the repository root:
- npm ci
- npm run db:migrate / npm run import:data
- npm run verify:data
- npm run typecheck
- npm test
- npm run build
- npm run test:browser (requires Playwright Chromium)
- npm run start:api / npm run dev:web (separate terminals)

The main agent owns manifests, lockfile, contracts, integration and Git operations.
Delegate bounded independent files only when useful; no shared-file concurrent writes
or branch switching by subagents. Model availability depends on the current environment;
use GPT-6.1 Sol / high for the main conversation and GPT-6.1 Sol / low or medium
for execution subagents where supported. Verify overrides or report limitations; do not
change global agent settings.
Update the plan with actual commands, results, limitations and handoff before stopping.
At every stage completion, comment an actionable human-review checklist on that stage
issue and record it in the plan; include steps, expected results and unverified scope.
SPFx package build success is not proof of runtime acceptance in SharePoint.

## 中文源码注释要求

- 为初级程序员编写简体中文注释，解释用途、数据流、业务规则和边界；新增或修改程序源码（如 .ts、.tsx、.js、.mjs、.cjs 及手写类型声明）时同步维护。
- 配置文件（含 TypeScript 配置脚本及环境配置）、测试及夹具、编译产物、HTML 等静态文件不纳入范围；按文件用途判断，不能只看扩展名。
- 文件顶部使用 `/** ... */` 说明这是什么文件或模块；类、接口、类型、函数和方法使用标准 TSDoc（JavaScript 使用 JSDoc）`/** ... */`，先说明“是什么”（代表的数据、结构、取值或程序角色），再按必要性解释“做什么”、规则和边界。注释放在声明及装饰器之前，必要时补充 `@param`、`@returns`。
- 关键逻辑使用简短中文 `//` 解释规则、原因或边界，避免逐行复述语法；代码变更时同步更新注释。
- Graph 及项目领域术语保留英文原词，例如 resource、Application/application、Delegated/delegated、permission、scope、appRole、Service Principal、admin consent、RSC、family；不翻译成中文，大小写按原语境使用。
- 产品界面、错误消息、官方权限原文及数据契约保持英文；不为补注释改变程序行为。
- 阶段验收检查范围、格式、类/接口/函数/方法覆盖、关键逻辑、术语保留和说明准确性，并在交接中记录结果。
