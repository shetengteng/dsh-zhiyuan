# dsh-知源 Spring Boot 式 Controller 与模型分层分析

<!-- maintained-by: human+ai -->

- **文档状态**：待评审
- **适用范围**：`src/controller/`、`src/model/`、`src/service/`、`src/view/` 之间的 Host 接口与数据模型边界
- **目标**：用接近 Java Spring Boot 的心智模型明确“哪个入口由哪个 Controller 负责”“哪些对象是 Entity、Request、Response、Context/DTO”，在不改变 DSH 插件运行时契约的前提下减少类型混用
- **非目标**：本文件不把插件改造成 HTTP/REST 服务；不修改 `kb_*` 工具名、`/zhiyuan` RPC channel、`op` 值、`destCategory`、`path`、`relPath` 等非知识库标识契约；知识库标识统一使用 `kbId`，不保留旧别名；不调整 View 的 slot 选择
- **分析基线**：提交 `08c4829`；写入本文前工作区无未提交改动
- **与既有方案的关系**：继承 [`2026-09-07-01-dsh-知源分层架构重构方案`](./2026-09-07-01-dsh-知源分层架构重构方案.md) 的 `view / controller / service / platform / model / content` 总体分层。本文件仅细化其中的 Controller 职责和 `model/` 内部分类；若既有方案与本文对 `model/` 目录的细分归属有冲突，以本文的细分方案为候选目标。

## 1. 结论先行

当前代码已经具备 Spring Boot 中的“Controller → Service → 基础设施”主干：`src/controller/` 接住 DSH 命令、工具和私有 RPC，`src/service/` 执行业务，`src/platform/` 处理路径、任务与宿主探测，`src/view/` 只通过 bridge 调用 Host。

真正不足不在于缺少 Controller，而在于两个边界仍是隐式的：

1. 模型总出口曾同时放置持久化对象、请求入参、返回结果、错误和跨格式转出，无法从名称判断对象能否落盘、能否跨 RPC、能否直接给 UI；现行代码已按 Entity、Request、Response、Context、Wire 等目录拆开。
2. [`src/controller/rpc/knowledge-operation-controller.ts`](../src/controller/rpc/knowledge-operation-controller.ts) 的 `operation` 已承担 RPC Controller 的职责，但输入、输出均是 `unknown`，Client 和 Host 分别维护相近的 envelope 类型，无法通过类型系统约束某个 `op` 的请求与响应对应关系。
3. command、tool、RPC 三条入口各自组装相似的导入和检索入参，渠道差异没有收敛为同一个应用请求，长期会出现默认值和校验规则漂移。

建议保留现有顶层结构，并做以下定向调整：

```text
外部输入
  ├─ /kb 命令 ────────> Command Controller
  ├─ kb_* 工具 ───────> Tool Controller
  └─ /zhiyuan RPC ───> RPC Controller
                              ↓
                    Request codec / mapper
                              ↓
                         Service 用例
                              ↓
                 Repository / platform / content
                              ↓
                      Response mapper / envelope
                              ↓
                           View bridge
```

`Request` 与 `Response` 都是可序列化 DTO；`Context` 是 Host 内部的调用上下文，不是 DTO，不能经 RPC 返回给 View。`Entity` 只表示持久化真相，Controller 不应直接把它作为响应暴露。

## 2. Spring Boot 概念在本插件中的对应关系

知源是 Host + Web Client 双产物的 DSH 插件，不存在 HTTP `@RestController`。因此应借用 Spring Boot 的**职责边界**，而不是照搬 HTTP 路由或 Java class 形式。

| Spring Boot 概念   | 知源对应物                                     | 当前位置或建议位置                               | 责任                                                                  |
| ------------------ | ---------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| Controller         | DSH command、tool、private RPC 的入站适配器    | `src/controller/{command,tool,rpc}/`             | 接收外部输入、运行时校验、映射 Request、调用 Service、序列化 Response |
| Request DTO        | 命令/工具/RPC 归一后的业务请求                 | `src/model/request/`                             | 表达一次用例需要的、已校验的输入                                      |
| Response DTO       | Host 返回给 tool、command 或 View 的稳定结果   | `src/model/response/`                            | 表达客户端可消费的数据，不能泄漏文件系统实现或事务对象                |
| Entity             | `catalog.json` 和库目录中的持久化领域对象      | `src/model/entity/`                              | 保存、更新、约束持久化状态                                            |
| Value Object       | 格式、预览、配额等无独立身份的值               | `src/model/value/` 或所属格式模块                | 表示不可变语义，不承担 transport 路由                                 |
| Context            | 一次事务、格式处理或路径解析的内部工作上下文   | `src/model/context/`、`content/host-contract.ts` | 只在 Host 内部传递，可能包含路径、锁、已加载实体等不可序列化信息      |
| Service            | 知识库、条目、导入、检索、偏好等用例           | `src/service/`                                   | 编排业务规则，不认识 DSH command、tool 或 View                        |
| Repository         | catalog JSON / 库文件树的持久化访问边界        | 建议 `src/repository/kb/`，可分阶段抽取          | 把读写文件和实体映射从业务用例中隔离                                  |
| Transport contract | RPC channel、endpoint、envelope、`op` 判别联合 | `src/model/wire/`                                | 仅定义跨 Host/View 的通讯形状和错误封装                               |

### 2.1 DTO 与 Context 不是同一个概念

“DTO”是 Data Transfer Object 的总称，重点是可以在层与进程边界传输；在本仓库中，`request/`、`response/`、`wire/` 下的对象都属于 DTO。`context/` 则是内部执行状态，例如已解析的 `dataRoot`、已读出的 `catalog` 或内容 handler 依赖，不能让 View 构造，也不能返回给 View。

因此不建议再建一个泛化的 `model/dto/` 并把所有东西放进去。`request/` 和 `response/` 本身已经表达 DTO 的传输方向；`context/` 独立出来可以避免它被误用为 RPC payload。

## 3. 当前接口入口与 Controller 归属

### 3.1 Host 装配入口不是业务 Controller

[`src/index.ts`](../src/index.ts) 的 `apply()` 只负责创建共享 `JobRunner`、注册各适配器并在 `ctx.effect()` 中清理资源。它相当于 Spring Boot 的 application bootstrap / configuration，不应继续增长业务逻辑。

[`src/skills/skill.ts`](../src/skills/skill.ts) 注册 skill 和 system prompt，也属于 DSH 扩展装配，不是知识库业务 Controller。

### 3.2 Command Controller：`/kb`

建议将 [`src/controller/command/kb-command-controller.ts`](../src/controller/command/kb-command-controller.ts) 与 [`src/controller/command/kb-command-parser.ts`](../src/controller/command/kb-command-parser.ts) 明确为 `controller/command/` 下的 `KbCommandController` 与 parser。它负责把命令文本和 flags 映射为应用 Request，不能在此层直接读写 catalog 或文件。

| 当前命令                                  | 建议 Controller 方法 | 归一后的 Request                                  | Response                   | 调用的用例           |
| ----------------------------------------- | -------------------- | ------------------------------------------------- | -------------------------- | -------------------- |
| `/kb status`                              | `getJobStatus()`     | `GetJobStatusRequest`                             | `JobStatusResponse`        | Job status 查询      |
| `/kb import <path> --kb <id> --to <类目>` | `importFromPath()`   | `ImportFromPathRequest`                           | `ImportResponse`           | 导入服务             |
| `/kb search ...`                          | `search()`           | `InitialSearchRequest` 或 `ContinueSearchRequest` | `SearchResponse`           | 检索服务             |
| `/kb call <json>`                         | `callOperation()`    | `KnowledgeOperationRequest`                       | 对应 operation 的 Response | 仅转交共享 RPC codec |

`/kb call` 不应成为绕过校验的后门。它如果保留，只能把 JSON 交给与私有 RPC 相同的 `KnowledgeOperationRequest` runtime codec；不能直接把解析后的任意对象送入 service。

### 3.3 Tool Controller：`kb_*`

建议将 [`src/controller/tool/kb-tool-controller.ts`](../src/controller/tool/kb-tool-controller.ts)、[`src/controller/tool/kb-tool-request-mapper.ts`](../src/controller/tool/kb-tool-request-mapper.ts)、[`src/controller/tool/kb-tool-response-renderer.ts`](../src/controller/tool/kb-tool-response-renderer.ts) 归为 `controller/tool/`。Tool schema 仍是模型可见的 DSH 契约；Controller 负责把 schema 已初筛的 `unknown` 再收窄为 Request，并将 Response 渲染为 tool text/metadata。

| 当前工具    | 建议 Controller 方法 | Request                                           | Response              | 说明                                          |
| ----------- | -------------------- | ------------------------------------------------- | --------------------- | --------------------------------------------- |
| `kb_list`   | `listKbs()`          | `ListKbsRequest`                                  | `KbSummaryResponse[]` | 无输入不等于无 Request；空对象请求可保持显式  |
| `kb_import` | `importFromPath()`   | `ImportFromPathRequest`                           | `ImportResponse`      | 与 command、RPC 路径导入复用同一应用请求      |
| `kb_search` | `search()`           | `InitialSearchRequest` 或 `ContinueSearchRequest` | `SearchResponse`      | cursor 续页必须是判别联合，不用可选字段拼形状 |

Tool 的展示文本属于最外层 presentation，不能污染 `ImportResponse`、`SearchResponse` 的领域字段。

### 3.4 RPC Controller：`/zhiyuan`

当前 [`src/controller/rpc/knowledge-rpc-controller.ts`](../src/controller/rpc/knowledge-rpc-controller.ts) 注册 `/zhiyuan` 的 `operation` 和 `status` endpoint；[`src/controller/rpc/knowledge-operation-controller.ts`](../src/controller/rpc/knowledge-operation-controller.ts) 通过 `op` 白名单做实际分派。这已经是 RPC Controller，只是名称和 contract 尚未显式化。

建议组织为：

```text
src/controller/rpc/
├── knowledge-rpc-controller.ts       # 注册 channel / endpoint，封装错误 envelope
├── knowledge-operation-controller.ts # 按判别联合分派语义 operation
└── knowledge-request-codec.ts        # unknown → Request 的运行时收窄
```

保留单个 `operation` endpoint 和既有 `op` 字符串，避免不必要地改变私有 RPC 协议；在代码层把每个 `op` 看作一个“虚拟 endpoint”。

| `operation.op`    | 建议 Controller 方法  | Request                                           | Response               |
| ----------------- | --------------------- | ------------------------------------------------- | ---------------------- |
| `list`            | `listKbs()`           | `KnowledgeListOperation`                          | `KbSummaryResponse[]`  |
| `create`          | `createKb()`          | `KnowledgeCreateOperation`                        | `KbCard`               |
| `update`          | `updateKb()`          | `KnowledgeUpdateOperation`                        | `KbCard`               |
| `deleteKb`        | `deleteKb()`          | `KnowledgeDeleteKbOperation`                      | `OperationAckResponse` |
| `tree`            | `listTree()`          | `KnowledgeTreeOperation`                          | `KbTreeNodeResponse[]` |
| `read`            | `readEntry()`         | `ReadEntryRequest`                                | `ReadEntryResponse`    |
| `readPage`        | `readEntryPage()`     | `ReadEntryPageRequest`                            | `EntryPageResponse`    |
| `write`           | `writeEntry()`        | `WriteEntryRequest`                               | `WriteEntryResponse`   |
| `deleteEntry`     | `deleteEntry()`       | `DeleteEntryRequest`                              | `DeleteEntryResponse`  |
| `pick`            | `pickSource()`        | `PickSourceRequest`                               | `PickSourceResponse`   |
| `import`          | `importEntry()`       | `ImportRequest`                                   | `ImportResponse`       |
| `search`          | `search()`            | `InitialSearchRequest` 或 `ContinueSearchRequest` | `SearchResponse`       |
| `prefs`           | `getPreferences()`    | `GetPreferencesRequest`                           | `PreferencesResponse`  |
| `setPrefs`        | `updatePreferences()` | `UpdatePreferencesRequest`                        | `PreferencesResponse`  |
| `status` endpoint | `getJobStatus()`      | `GetJobStatusRequest`                             | `JobStatusResponse`    |

`deleteKb`、`deleteEntry`、`write` 目前返回 `{ ok: true }`。该对象与 RPC envelope 的 `{ ok: true, value }` 容易混淆；后续应改为含业务语义的响应，例如 `{ deleted: true, kbId }`、`{ updated: true, path }`，但需要在同一变更中更新 View parser。

### 3.5 不属于 Controller 的对象

| 模块                                            | 不是 Controller 的原因                      | 应保留职责                                                               |
| ----------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| [`src/view/bridge.ts`](../src/view/bridge.ts)   | 它是浏览器侧 transport client，不是入站接口 | 调用 RPC、处理断连、接收 `unknown` 响应后交给 parser                     |
| `src/view/payload/`                             | 它是 Response codec / UI adapter            | 运行时验证 Host 返回值，禁止直接 `as` 断言落盘成功                       |
| [`src/service/kb/`](../src/service/kb/)         | 它包含业务用例与领域规则                    | 不认识 command、tool、slot 或 JSX                                        |
| [`src/service/search/`](../src/service/search/) | 它是检索用例和 port                         | 保持通过 `SearchKbAccess` 间接访问知识库能力                             |
| [`src/content/`](../src/content/)               | 它是按格式内聚的横切能力层                  | 保持 Host/Client 以及 server/client 结构，不强行塞入 Controller 或 model |
| [`src/platform/`](../src/platform/)             | 它是基础设施                                | 路径 containment、symlink 检查、任务队列、DSH 宿主定位                   |

## 4. 目标目录与依赖方向

建议在现有顶层分层下按职责再细分；TypeScript 文件保持 kebab-case，不要求使用 Java class。函数式 Controller 只要守住边界，与 Spring 的层次职责等价。

```text
src/
├── index.ts
├── controller/
│   ├── command/
│   │   ├── kb-command-controller.ts
│   │   └── kb-command-parser.ts
│   ├── tool/
│   │   ├── kb-tool-controller.ts
│   │   ├── kb-tool-request-mapper.ts
│   │   └── kb-tool-response-renderer.ts
│   └── rpc/
│       ├── knowledge-rpc-controller.ts
│       ├── knowledge-operation-controller.ts
│       └── knowledge-request-codec.ts
├── service/
│   ├── kb/
│   │   ├── kb-lifecycle.ts
│   │   ├── entry.ts
│   │   ├── import-service.ts
│   │   └── preferences.ts
│   └── search/
├── repository/
│   └── kb/
│       ├── catalog-repository.ts
│       └── file-catalog-repository.ts
├── platform/
├── model/
│   ├── entity/
│   ├── value/
│   ├── request/
│   ├── response/
│   ├── context/
│   ├── wire/
│   ├── error/
│   └── constants.ts
├── content/
└── view/
```

`repository/` 已承载 catalog JSON 解析、原子写和锁；`FileCatalogRepository` 由 service 持有的 repository port 使用。条目和导入文件访问继续在确认稳定边界后再抽取，避免为目录形式过早抽象。

依赖方向应为：

```text
view --RPC--> controller --> service --> repository --> platform
                      │        └──────> content
                      └───────────────> platform

model 是共享的低层类型；content 可依赖 model；view 仅运行时依赖 bridge 和 Client content，
不能运行时 import controller、service、repository 或 platform。
```

## 5. `model/` 的明确分类

### 5.1 Entity：持久化真相

当前唯一明确建模的持久化聚合是 `catalog.json`。不应因为某对象在响应中出现就把它称为 Entity。

| 当前类型       | 正确领域角色                  | 建议目标文件                   | 说明                                                             |
| -------------- | ----------------------------- | ------------------------------ | ---------------------------------------------------------------- |
| `Catalog`      | 聚合根 Entity                 | `model/entity/catalog.ts`      | 对应 `catalog.json` 根对象，含版本、最近使用库、偏好和库卡片     |
| `KbCard`       | `Catalog` 内嵌 Entity         | `model/entity/catalog.ts`      | 有稳定 `id` 与生命周期字段，是可被更新、删除的库卡片             |
| `CatalogPrefs` | Value Object，不是独立 Entity | `model/value/catalog-prefs.ts` | 无独立 identity，作为 catalog 的嵌入值保存                       |
| 库目录下的文件 | 当前尚未有显式 TS Entity      | 不在本轮伪造 `EntryEntity`     | 文件元数据目前按需读取；仅在引入 manifest 后再定义持久化条目实体 |

`KbSummaryResponse` 不是 Entity：它包含 `categories`、`approxDocs`、`lastUsed` 等从磁盘和当前 catalog 推导出的字段，应被定义为 Response projection。

### 5.2 Request：进入 Service 前已收窄的业务输入

请求对象必须经过 Host 边界校验；Controller 不把 `Record<string, unknown>` 或 command flags 直接交给 service。建议按用例归类：

| 当前类型或输入                                  | 建议 Request 类型                                                                       | 建议文件                               | 备注                                                   |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------ |
| `CreateKbRequest`                               | `CreateKbRequest`                                                                       | `model/request/kb-request.ts`          | `title`、`description`、`aliases`                      |
| `UpdateKbRequest`                               | `UpdateKbRequest`                                                                       | `model/request/kb-request.ts`          | `kbId` 放在同一个请求内，不再由 service 参数分散携带   |
| RPC `deleteKb` 字段                             | `KnowledgeDeleteKbOperation`                                                            | `model/wire/knowledge-operation.ts`    | `kbId`、`confirm`                                      |
| `ImportFromPathRequest`                         | `ImportFromPathRequest`                                                                 | `model/request/import-request.ts`      | 保留 `kbId`、`sourcePath`、`destCategory` 等既有字段名 |
| RPC `sourceBase64` 导入                         | `ImportDroppedBytesRequest`                                                             | `model/request/import-request.ts`      | 与路径导入组成判别联合 `ImportRequest`                 |
| `EntryWriteChange`、`TablePatch`                | `EntryWriteChange` 的内容字段                                                           | `model/request/entry-request.ts`       | 内容变更是写入 Request，不是 Entity                    |
| read、readPage、deleteEntry 的 RPC 字段         | `KnowledgeReadOperation`、`KnowledgeReadPageOperation`、`KnowledgeDeleteEntryOperation` | `model/wire/knowledge-operation.ts`    | 保留 `kbId`、`path`、分页字段                          |
| `InitialSearchRequest`、`ContinueSearchRequest` | `InitialSearchRequest`、`ContinueSearchRequest`                                         | `model/request/search-request.ts`      | 必须保持 `kbId + query` 与 `cursor` 两种判别形状       |
| setPrefs 字段                                   | `UpdatePreferencesRequest`                                                              | `model/request/preferences-request.ts` | 在 Controller 完成配额范围校验后传入 service           |
| pick 字段                                       | `KnowledgePickOperation`                                                                | `model/wire/knowledge-operation.ts`    | `kind` 为 `'file'` 或 `'dir'`                          |

为避免 controller、tool、command 有三套不一致的默认值，应遵守：**各入口可以有自己的原始输入类型，但都必须映射到同一个应用 Request。**例如 command 的 `--to` 默认值、tool 的可选 `destCategory`、RPC 的显式字段，最终都产生同一个 `ImportFromPathRequest`。

### 5.3 Response：Controller 可返回、View 可解析的投影

Response 不能直接返回 `Catalog`、`KbCard`、`CatalogTransactionContext` 或文件系统路径对象。推荐分类如下：

| 当前类型                                           | 建议 Response 类型                           | 建议文件                            | 说明                                                           |
| -------------------------------------------------- | -------------------------------------------- | ----------------------------------- | -------------------------------------------------------------- |
| `KbSummaryResponse`                                | `KbSummaryResponse`、`KbSummaryResponse[]`   | `model/response/kb-response.ts`     | 列表投影；不把 `KbCard` 直接暴露为响应                         |
| `KbTreeNodeResponse`                               | `KbTreeNodeResponse`、`KbTreeNodeResponse[]` | `model/response/kb-response.ts`     | 目录树投影                                                     |
| `ReadEntryResponse`                                | `ReadEntryResponse`                          | `model/response/entry-response.ts`  | 维持 text/table 判别联合                                       |
| `TableEditorPage`、`TableWindowData`               | `EntryPageResponse`                          | `model/response/entry-response.ts`  | 表格窗口和翻页结果                                             |
| `ImportFileResponse`、`ImportResponse`             | `ImportFileResponse`、`ImportResponse`       | `model/response/import-response.ts` | 保留 copied/skipped/failed/warnings 语义                       |
| `JobStatusResponse`                                | `JobStatusResponse`                          | `model/response/job-response.ts`    | Host 内存态的只读投影                                          |
| `SearchResult` 及 `SearchOverview*`、`SearchFile*` | `SearchResponse` 家族                        | `model/response/search-response.ts` | 搜索结果本来就是 Response DTO，应统一归类                      |
| prefs 读取结果                                     | `CatalogPrefs`                               | `model/value/catalog-prefs.ts`      | 读取结果沿用同一份值对象字段，不另建已删除的兼容类型           |
| `{ ok: true }`                                     | 业务化 Ack Response                          | 对应 response 文件                  | 改为 `updated`、`deleted` 等可读字段，避免与 RPC envelope 混淆 |

Host 发回来的值在 View 侧仍然是 `unknown`。`view/payload/` 应为每个 Response 提供运行时 parser；不能因 TypeScript 共享类型就删除运行时校验，更不能把未经确认的乐观状态当成已落盘。

### 5.4 Context：只服务内部执行，不跨 RPC

| 当前类型                                                    | 正确分类                      | 建议位置                                         | 原因                                                            |
| ----------------------------------------------------------- | ----------------------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| `CatalogTransactionContext`                                 | `CatalogTransactionContext`   | `model/context/kb-context.ts`                    | 持有 `dataRoot` 与已读 catalog，仅供 `withTransaction` 回调使用 |
| `DestinationResolution`                                     | 导入路径解析 Context / Value  | `model/context/kb-context.ts`                    | 是导入流水线的中间产物，不是客户端数据                          |
| `EntryReadContext`、`EntryWriteContext`、`EntryPageContext` | 内容 handler Context          | 保持在 `content/host-contract.ts` 或其同职责目录 | 既包含格式能力信息又只在 Host 使用，不应搬成通用 RPC DTO        |
| `PrepareImportContext`                                      | 内容导入 Context              | 保持在 `content/host-contract.ts`                | 同上                                                            |
| `SearchKbAccess`                                            | Service port，不是 Context    | `service/search/kb-access.ts`                    | 表达 search 对 kb 的抽象依赖，不能被误称为 DTO                  |
| `HostCtx`、`ToolCtx`、`PrivateRpcContext`                   | DSH framework context         | 保持 controller 内部                             | 是宿主注入对象，不属于领域 model                                |
| `KnowledgePrivateConnection`                                | View transport client context | 保持 `view/bridge.ts`                            | 是浏览器 bridge 能力，不属于业务 Context                        |

### 5.5 Wire、Error 与 Value：不要塞回单一总出口

| 类别      | 建议内容                                                                                                         | 目标文件                                                          |
| --------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Wire      | `/zhiyuan` channel、`operation` / `status` endpoint、`KnowledgeOperationRequest`、`RpcEnvelope<T>`、错误 payload | `model/wire/knowledge-rpc-contract.ts`                            |
| Error     | `KbError`、`KbErrorCode`、面向客户端的 `KnowledgeRpcError`                                                       | `model/error/kb-error.ts`、`model/wire/knowledge-rpc-contract.ts` |
| Value     | `EntryFormat`、`EntryContentKind`、`EntryPreviewView`、预览状态与截断枚举                                        | `model/content-contract.ts` 或所属 `content/` contract            |
| Constants | 包名、DSH 相关常量、配额和分页上限                                                                               | `model/constants.ts`                                              |

不建议重新建立一个新的“总出口”模型模块作为长期 facade。它会再次把所有类别藏在一个名字里，也让调用方形成“随便 import types”的习惯。迁移应在同一提交更新 import 后删除旧总出口；若确实需要渐进迁移，临时 facade 必须有删除任务，不能成为第二个真实来源。

## 6. 共享 RPC wire 契约

当前 Host 与 View 各自定义相似的 `RpcResult`，`callKnowledgeHost()` 返回 `Promise<unknown>`。应把 wire envelope、operation 请求联合和 operation 到响应的映射放在同一个只含类型和常量的模块中。

示意如下，字段名与既有协议保持不变：

```ts
export type KnowledgeOperationRequest =
  | { op: "list" }
  | { op: "create"; title: string; description: string; aliases?: string[] }
  | { op: "deleteKb"; id: string; confirm: boolean }
  | { op: "read"; id: string; path: string }
  | { op: "import"; kbId: string; sourcePath: string; destCategory: string }
  | { op: "search"; kbId: string; query: string; limit?: number }
  | { op: "search"; cursor: string; limit?: number };

export type KnowledgeRpcEnvelope<T> =
  | { ok: true; value: T }
  | { ok: false; error: KnowledgeRpcError };
```

实际实现需补齐全部既有 `op`，并让每个 operation 映射到唯一 Response。类型并不能替代 runtime codec：

1. RPC Controller 先把 `unknown` 解析为 `KnowledgeOperationRequest`，解析失败返回稳定错误 envelope。
2. Controller 把 wire request 映射为应用 Request，调用 service。
3. Controller 把 service result 映射为 Response，包入 `KnowledgeRpcEnvelope<T>`。
4. View bridge 解包后仍把跨进程结果视为 `unknown`，交给 `view/payload/` parser 收窄。

这样既保留 Host 边界校验，也让 command、tool、View 对同一业务 operation 使用同一份类型契约。

## 7. Service 与 Repository 的边界

Controller 只做入口适配；下列编排应该集中在 service，而不是继续堆在 `knowledge-operation-controller.ts`：

| Service              | 负责用例                                             | 现有实现来源                                                             |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------ |
| `KbLifecycleService` | list/create/update/delete knowledge base、最近使用库 | `service/kb/kb-lifecycle.ts`、`repository/kb/file-catalog-repository.ts` |
| `EntryService`       | tree/read/readPage/write/delete entry                | `service/kb/kb-tree.ts`、`entry.ts`                                      |
| `ImportService`      | 路径/拖放导入、配额、冲突、JobRunner 协作            | `service/kb/import*.ts`                                                  |
| `PreferencesService` | 读取和更新配额及默认库偏好                           | 当前 `knowledge-operation-controller.ts` 的 `setPrefs` 与 catalog 操作   |
| `SearchService`      | 初始检索、cursor 续页、命中详情                      | `service/search/`                                                        |

现有 [`src/repository/kb/file-catalog-repository.ts`](../src/repository/kb/file-catalog-repository.ts) 已隔离 JSON 解析、原子写和单写者锁；Service 通过 `CatalogRepository` port 使用它：

```text
CatalogRepository                 # port：read / withTransaction / save
└── FileCatalogRepository         # JSON 解析、临时文件 + rename、进程内单写者
```

`withTransaction` 的原子写与单写者语义必须保留；Repository 化不是把安全机制抽空。库根 containment、符号链接逃逸检查仍由 `platform/paths.ts` 提供，所有 Repository/Service 文件访问都要继续使用它。

### 7.1 Catalog 与磁盘目录的一次性迁移

`Catalog` 当前持久化版本为 `2`，目标形状为：

```json
{
  "version": 2,
  "lastUsedKbId": "...",
  "prefs": {
    "defaultKbId": "...",
    "maxFileBytes": 5242880,
    "maxKbBytes": 10737418240
  },
  "kbs": []
}
```

`FileCatalogRepository.read()` 在同一个进程内的 catalog 单写者锁中先处理存储迁移，再读取 canonical 数据：旧 v1 字段转换为 v2 并通过临时文件 + `rename` 原子写回；旧 `bases/` 目录只有在 `kbs/` 不存在时才原子 `rename` 为 `kbs/`。没有 catalog 时仍执行目录迁移，随后返回空 v2 聚合，不自动创建 catalog。两侧目录同时存在或任一路径不是目录时拒绝继续，避免把冲突数据静默覆盖；下次读取前人工消除冲突即可恢复。

搜索游标已升为 v4。它仍是自包含的 `kbId` 查询上下文，但旧版本游标按过期处理，不提供旧字段兼容解析。

## 8. 分阶段迁移检查清单

> 以下事项记录已实施状态；新增改动应继续通过对应检查后再勾选。

### 阶段 0：冻结现有契约

- [x] 记录工具名、command 名、`/zhiyuan` channel、endpoint、全部 `op`、现有请求字段和 Response shape。
- [x] 执行 `npm test`、`npm run build`、`git diff --check` 建立基线。
- [x] 将 catalog 持久化版本从 v1 迁移到 v2，并将磁盘根目录从 `bases/` 一次性迁移到 `kbs/`。

**本轮迁移约定**：v1 的 `lastUsedBaseId`、`defaultBaseId`、`maxBaseBytes`、`bases` 只在 Repository 读边界被转换；落盘后仅保留 `lastUsedKbId`、`defaultKbId`、`maxKbBytes`、`kbs`。`bases/` 与 `kbs/` 同时存在时拒绝自动合并，保留两侧数据并要求人工处理；缺少 catalog 时仍迁移目录，但不凭空创建 catalog。

### 阶段 1：先拆模型，不改运行行为

- [x] 将 `Catalog`、`KbCard`、`CatalogPrefs`、`KbError` 按 Entity / Value / Error 目录归位。
- [x] 将 Request、Response、Context、search result、content DTO 按本文件 §5 归位。
- [x] 更新全部 import，并删除旧的模型总出口，不保留长期 facade。
- [x] 确认本阶段只移动类型与纯 mapper，未改变 RPC payload。

### 阶段 2：建立 wire contract 与 codec

- [x] 将 Host 和 View 的重复 `RpcResult` 合并为 `KnowledgeRpcEnvelope<T>`。
- [x] 建立完整 `KnowledgeOperationRequest` 判别联合和 operation-response 映射。
- [x] 让 `knowledge-request-codec.ts` 负责 request codec，让 `view/payload/` 补齐 list/tree/prefs/status/pick 的 Response parser。
- [x] 确认 command、tool、RPC 都映射到同一个应用 Request，同时保留其渠道专属的原始输入校验。

### 阶段 3：按入口重命名和瘦身 Controller

- [x] 以 `command/`、`tool/`、`rpc/` 收纳 Controller 文件，入口文件只保留注册和调用。
- [x] 将 `knowledge-operation-controller.ts` 中的具体业务编排下沉到相应 service；Controller 不直接读写 catalog 或调用 Node 文件系统。
- [x] 确认仍保持单个 RPC `operation` endpoint，且没有为每个 `op` 制造碎片文件。

### 阶段 4：抽取 Repository

- [x] 首先抽 `CatalogRepository` 与 `FileCatalogRepository`，覆盖 JSON 解析、原子写和事务锁。
- [x] 评估 entry/import 的文件访问是否已形成稳定持久化 port；未形成稳定边界时不为目录形式过早抽象。
- [x] 确认没有把 View 的临时 state、JobRunner 内存状态或 content renderer 放入 Repository。

### 阶段 5：回归与运行时验收

- [x] 执行 `npm test`、`npm run build`、`git diff --check`。
- [x] 实际安装并检查 `dsh plugin --profile web add .`、`dsh --profile web --dump-config`，确认 Host 配置层存在。
- [ ] 在 `dsh web` 中验证 command、tool、工作台的 pending/error/断连状态以及每个 RPC Response parser。

## 9. 不变量与验收标准

实施本方案时必须同时满足：

1. `dsh-zhiyuan`、`zhiyuan`、`knowledge`、`kb_*`、`kbId`、`destCategory`、`path`、`relPath` 和已发布 `op` 值不因内部整理而改名。
2. View 不能运行时 import Host service、repository、platform 或 controller；所有建库、导入、检索与文件操作仍经 Host RPC。
3. 所有命令、工具、RPC、文件系统、JSON 输入在 Host 侧从 `unknown` 显式收窄；Response 也在 View bridge 边界运行时解析。
4. Entity 不直接作为 Response；Context、Repository entity、DSH framework context 都不能跨 RPC。
5. `Catalog` 原子写、进程内单写者、库根 containment 与 symlink 检查保持不变或得到等价证明。
6. 每个 `src/` 源文件仍不超过 300 行；避免为每个 `op` 或 DTO 机械生成只有数行的碎片文件。
7. `content/` 继续按格式内聚，不能因 DTO 分类把 CSV/Markdown 的 server/client 能力拆散。

## 10. 建议优先级

1. **P0 已完成：共享 RPC wire contract 与 View Response parser。**后续只在新增 operation 或 Response 时同步扩展 `model/wire/` 与 `view/payload/`。
2. **P0 已完成：维护分层模型边界。**新增模型应直接放入对应 Entity、Request、Response、Context、Wire、Error 或 Value 模块，不重新建立总出口。
3. **P1：让 command/tool/RPC 映射到同一应用 Request。**重点处理 import 与 search 的默认值、校验和 cursor 判别联合。
4. **P1：抽 `CatalogRepository`。**它能让持久化实体与业务用例的边界可测试、可替换。
5. **P2：评估 `/kb call` 的产品定位。**若仅用于开发诊断，应限制为同一 typed codec 的代理；若不再需要，后续单独决策移除，不能悄悄保留未受约束的通道。

这套整理能让 Java/Spring Boot 背景的开发者快速回答四个关键问题：外部调用先到哪个 Controller、Service 接收什么 Request、哪些对象会持久化、客户端究竟拿到什么 Response；同时不会破坏 DSH 插件的双产物和私有 RPC 运行时约束。

---

<!-- PKB-metadata
last_updated: 2026-09-09
commit: 08c4829
updated_by: human+ai
review_status: pending
review_score: 0
reviewed_by:
confidentiality: L1
-->
