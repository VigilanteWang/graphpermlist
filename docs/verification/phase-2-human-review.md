# 阶段 #4 人工审核清单

对应 PR：[#8](https://github.com/VigilanteWang/graphpermlist/pull/8)。本阶段审核真实数据导入、分类、SQLite 和四个只读 API；完整权限浏览界面属于 #5。

## 1. 先看交付证据与分类决策

- 看 PR diff、[验证记录](https://github.com/VigilanteWang/graphpermlist/blob/codex/phase-2-catalog-api/docs/verification/phase-2.md)、[API 契约](https://github.com/VigilanteWang/graphpermlist/blob/codex/phase-2-catalog-api/docs/api-contract.md)和[分类依据](https://github.com/VigilanteWang/graphpermlist/blob/codex/phase-2-catalog-api/docs/classification.md)。重点判断分类是否合理，尤其精确名称覆盖和 Uncategorized 中的未决项。
- 当前快照有 1,664 个普通定义、1,036 个合并名称，4 个禁用定义，排除 RSC 60。189 个定义 / 113 个名称保留在 Uncategorized，须确认这种保守归类可以接受；这些数字不是未来输入的固定限制。
- 确认没有提交个人数据、来源租户元数据、凭据、本机绝对路径或 SQLite 文件；没有启用 synchronize、在线 Graph 采集或授权操作。

## 2. 自己迁移、导入并检查幂等

使用 PR 分支和 `.nvmrc` 指定的 Node，以及 npm 10.9.2，在仓库根目录执行：

```sh
npm ci
npm run verify:data
npm run build:shared
npm run build:api
npm run db:migrate
npm run import:data
npm run import:data
npm run start:api
```

默认写入 `var/catalog.sqlite`；若 `.env` 或环境变量设置了 SQLITE_PATH，以实际配置为准。两次导入和 API 必须使用同一个路径。最近的本地只读检查发现默认文件为 0 字节、没有表：此前自动验证使用隔离数据库，**并未填充默认数据库**。上述迁移/导入会创建并填充它；这次文档补充没有替你执行导入。

预期迁移成功，首次导入返回 `definitionCount:1664`；如果该库已导入相同版本，首次也可能直接复用。再次导入应为 `reused:true`、versionId 不变。导入命令自行退出，最后一个 HTTP 启动命令持续运行。需要页面连接冒烟时，另一个终端执行 `npm run dev:web`，导入后应显示 `Catalog connected: 1 resource(s).`。

## 3. 抽查四个 API 的业务结果

保持 API 运行，在另一个终端执行（修改端口后同步调整 BASE）：

```sh
BASE=http://localhost:3000/api/v1/resources
GRAPH=00000003-0000-0000-c000-000000000000
curl "$BASE"
curl "$BASE/$GRAPH/categories"
curl "$BASE/$GRAPH/permissions?showDisabled=true"
curl "$BASE/$GRAPH/permissions/User.Read"
curl "$BASE/$GRAPH/permissions/Mail.Read"
```

逐项核对：

- `/resources` 是 `ready`，资源 ID 为上面的 Graph App ID；默认 `definitionCount` 为 1,660。source 有摘要、导入时间、分类版本和 `excludedRscCount:60`，没有本机路径。
- 全量 `permissions?showDisabled=true` 的 `definitionCount` 为 1,664、`permissionCount` 为 1,036；默认请求或 `showDisabled=false` 为 1,660 个定义。不要把定义数当成合并行数。
- `User.Read` 只有 Delegated；`Mail.Read` 的 item 有 Application / Delegated 两种类型，详情保留两套 GUID、官方标题及文案。Application 同意要求为 true；此快照中 Mail.Read 的 Delegated 为 false，且保留用户同意文案。

## 4. 重点抽查筛选、计数与详情

```sh
curl "$BASE/$GRAPH/permissions?permissionType=Application&adminConsentRequired=false"
curl "$BASE/$GRAPH/permissions?category=exchange&family=Mail&q=read"
curl "$BASE/$GRAPH/categories?category=exchange&family=Mail&q=read"
curl "$BASE/$GRAPH/permissions?q=no-such-permission-xyz"
curl -i "$BASE/$GRAPH/permissions?showDisabled=invalid"
curl -i "$BASE/$GRAPH/permissions/NoSuchPermission"
```

预期依次为：空列表且两种计数为 0（不能跨类型拼接命中）；相同筛选的列表/分类总数及分类项计数一致；无结果仍是 `ready`；无效布尔值为 400；未知权限为 404。未知资源可把 GRAPH 换为另一个格式正确的 UUID，预期 404。

从 Mail.Read 详情复制一个类型的 GUID，作为 `q` 请求列表及同一详情：列表定义/标签只留下命中类型，详情 `allDefinitions` 仍有两个类型。再从全量列表选择一个 `isEnabled:false` 的定义，用其 GUID 搜索：默认不命中，`showDisabled=true` 才命中。不要只看 HTTP 200，还要检查正文。

## 5. 复核事务和回归证据

```sh
npm run typecheck
npm test
npm run build
npm run check:react
npm run test:browser
```

当前提交的预期基线为 14 项测试、2 项浏览器测试通过。浏览器命令需要安装 Playwright Chromium（缺失时运行 `npx playwright install chromium`）；SPFx 构建成功仍不代表 SharePoint 页面运行成功。

人工重点读 `tests/catalog.test.mjs` 中事务测试及对应日志：损坏输入、中途批次写入失败、旧版本停用后发布失败，都断言旧有效版本和表数据恢复；CLI 独立进程写盘后由另一个 HTTP context 读取。可以运行自动测试复核这些故障场景，无需手动破坏日常使用的数据库。

## 6. 给出审核结论

在 PR #8 留下“通过 / 需修改 / 受阻”，附运行环境、实际操作结果及未验证项；发现问题时给出请求、实际响应和预期行为，并先脱敏。分类争议列出具体权限名称及建议类别。

通过后由用户决定合并；本清单不授权自动合并、关闭 issue、部署或启动 #5。真实 SharePoint 页面、样式隔离和窄 Web Part 验收仍留后续阶段，当前前端没有完整目录浏览界面。
