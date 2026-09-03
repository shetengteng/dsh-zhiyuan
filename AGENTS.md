# Codex 项目规则

本文件由 `.cursor/rules/*.mdc` 转换而来，供 Codex 在本仓库中工作时读取。

## 规则适用范围

- “始终适用”规则适用于本仓库的所有相关工作。
- 修改 `src/client/**/*.{ts,tsx,js,css}` 时，适用 Client UI 规则。
- 修改 `src/client/**/*.{ts,tsx}` 时，额外适用 React 规则。
- 修改 `src/**/*.{ts,tsx,js,css}` 时，适用模块体积规则。
- 修改 `**/*.{ts,tsx}` 时，适用 TypeScript 规则。
- 修改 Host/Client、`package.json`、`cordis.patch.yml` 或构建脚本时，适用插件契约规则。

## DeepSeek Harness 插件契约

这是独立 Git 仓库里的 Host + Web UI 双面插件，不是 Harness 单体内的 `packages/*`。

### 身份与命名

- 同一个 npm 包和一次 `dsh plugin add` 同时提供 Host 和 Client：
  - Host：`exports["."]` → `lib/index.js`
  - Client：`exports["./client"]` → `lib/client.js`
- `cordis.patch.yml` 只插入一行 Host，`id` 必须是 `zhiyuan`，`name` 必须等于 `package.json` 的 `name`（`dsh-zhiyuan`）。
- Client 由 `dsh.client.platform: "web"` 自动加载；不要添加第二条安装命令，也不要自建 HTTP 服务。
- 禁止使用 `workspace:` 依赖，禁止冒充 `@deepseek-ai` 官方包。
- 品牌名和设置入口均为“知源”。包名为 `dsh-zhiyuan`，不要写 `dsh-knowledge`。产品对象仍称“知识库”和“类目”，不要使用“开柜”“落柜”“柜门”等说法。

### 座椅与数据所有权

- UI 只能通过 `ctx.slots.inject` 使用已有座椅（`overlay`、`settings.section`、`toolview`）。座椅是类型化契约，不是 DOM 选择器；目标 DSH 版本为 `0.1.1-rc.2`。
- 禁止猜测 slot 名称，禁止修改 DSH 壳的私有 DOM。
- 工作台使用 `settings.section`，`id: knowledge`，`label: 知源`；不要再制作一份插件窄卡工作台。
- 持久状态由 Host 负责（catalog、文件夹、commands、tools）。Client 只保存短暂展示态，通过 `remote.commands` 或 `settingsScope` 回调 Host。
- 浏览器没有 `ctx.agents` 或 `ctx.tools.execute`。建库、导入、检索只能经由 Host，禁止模型编造库 ID。
- 乐观更新在获得 Host 确认前不得视为已经落盘；必须展示 pending、error 和断连状态。
- 每个 `ctx` 注册、订阅、timer 和 slot 都必须可卸载。不要在模块顶层写进程级副作用；Host 资源使用 `ctx.effect()` 并返回 disposer。

### 构建约束

- Host 输出为 ESM `lib/index.js`。
- Client 输出为 lazy-CJS，必须包含：

  ```js
  window.__ModuleLoader__.load({ id: 'dsh-zhiyuan', factory })
  ```

- Client 不打包 React。展示层使用 JSX，构建配置使用 `jsx: 'automatic'`，运行时依赖 `require('react')` 或 `require('react/jsx-runtime')`。
- `main`、`exports`、`files` 和 `dsh.bundle.patch` 指向的路径，在干净构建后必须真实存在。
- 不要把 `src/` 当作运行入口。Git 安装会执行 `prepare`；交付应优先保证可复现的 `lib/`。

### 验收边界

分别声明实现、安装、激活和运行时验证的结果；没有实际执行的检查不得声称通过。

```sh
dsh plugin --profile web add .
dsh --profile web --dump-config
dsh web
```

`dump-config` 必须出现本包层。headless profile 没有 UI，不代表 Client 已成功加载。

## Client UI 规则

适用于知识库工作台、命中卡、预览等 Client UI，以及 `src/client` 下的相关实现。

### 产品气质

这是设置里的知识库工作台，不是营销页。优先级为：简洁、可读、可维护、性能、可复用。

- 设置 section 标签和页标题使用“知源”。产品对象仍称“知识库”“类目”。
- 使用 DSH 的 `--dsw-alias-*` 颜色 token，不使用纯黑或纯白。hover、focus、disabled、loading、error 等状态需要成套设计。
- 动效只表达状态，例如打开弹框或任务进行中；时长约 150–400ms。禁止 GSAP、粒子效果和 Three.js。
- 工作台占满 `settings.section`，不要做成插件窄卡的第二份工作台。

### 交互契约

- 建库、导入、删库和删文件都必须等待用户确认或填完必填项；ID 创建后只读。
- 明确展示 idle、pending、error、断连状态；失败可重试，错误文案使用人话。
- 乐观更新在 Host 确认前不得当作已经落盘。
- 可键盘到达的控件必须有可见的 focus 状态。
- 网页不能自行扫描磁盘，也不能充当网盘拖动大文件；导入时将本机路径交给 Host。

### 组件与状态

- 组件保持单一职责。拆分库列表、树、弹框、偏好和命中卡的展示与编排。
- 本地 UI 状态使用 `useState` 或 `useRef`；库和文件以 Host 为唯一真相，Client 只订阅并发送命令。
- `useEffect` 必须清理监听器和 timer；列表与树使用稳定的业务 `key`。

### 禁止事项

- 不要把本地状态直接当成持久化成功，也不要直接使用 `localStorage` 模拟落盘。
- 不修改 DSH 壳的私有 DOM，不自建路由。
- 不把建库、拷贝或 grep 逻辑复制进 Client；Client 只渲染 Host 返回的结果。
- 不为“好看”增加新的交互模式。先对齐 `design/2026-08-31-05-dsh-知识库交互布局.md` 和工作台原型。
- 遵循项目原有约定，不要在任务中主动使用 Pilot skill。

## 模块体积规则

适用于 `src/**/*.{ts,tsx,js,css}`。

- `src/` 下单个源文件原则上不超过 300 行，空行和注释也计入。
- 如果目标文件超过 300 行，先拆分模块再改功能；禁止继续向同一文件堆积逻辑。
- 按职责拆分类型/常量、纯函数、编排、UI 展示和样式。入口只负责 import 与注册，不承载实现。
- 新逻辑优先放入已有职责模块；没有合适模块时再新建，不要为了凑行数过度切碎。
- 压缩空行或把多个文件粘回一个文件以“过线”不算合规。
- 生成物 `lib/`、第三方代码和纯数据表可以例外；纯数据表变大时也不要把业务逻辑塞进去。
- 修改完成后，如果目标文件仍超过 300 行，必须在同一轮继续拆分，不要将超限留给后续。

## React 规则

适用于 `src/client/**/*.{tsx,ts}`。

### 组件与文件

- 使用函数组件和 hooks；组件、组件文件和主要导出物使用 PascalCase。
- Props 类型使用具体名称，例如 `BasePageProps`、`PreviewDialogProps`；不要在多个组件中重复使用泛用的 `Props`。
- 一个文件优先承载一个主要组件。确需组合导出时，文件名使用有意义的职责复数名，例如 `Dialogs.tsx`、`Icons.tsx`。
- 页面编排与纯展示拆开：Section 负责状态和 Host 调用，Page/Dialog/Card 负责渲染和事件回调，纯格式化函数保持无副作用。
- 事件回调使用 `onVerbNoun` 命名，例如 `onSelectBase`、`onOpenEntry`、`onDeleteEntry`；参数使用完整业务语义，例如 `baseId`、`entryPath`。

### 状态与副作用

- Host 返回的数据是唯一真相；Client 只保存短暂展示态，不直接读写文件、不递归扫描磁盘、不模拟落盘成功。
- 异步操作必须展示 pending、error、断连和可重试状态；提交期间正确禁用按钮，避免重复提交。
- hooks 只能在组件顶层调用；`useEffect` 中注册的监听、订阅、timer 和 editor 实例必须在 cleanup 中释放。
- effect 和事件处理中的异步任务必须处理失败；组件卸载或请求过期时，不能将旧结果无条件写回当前状态。
- 不要为派生数据重复创建 state；能从现有 props/state 计算的值直接计算。

### 渲染与交互

- 列表和树使用稳定的业务 key，不使用数组下标作为动态列表 key。
- 所有按钮明确指定 `type="button"` 或 `type="submit"`；输入项提供 label、错误提示和必要的键盘操作路径。
- 可操作元素必须可通过键盘到达，并使用可见的 `:focus-visible`；图标按钮提供 `aria-label`，弹框提供清晰标题和关闭路径。
- 用户内容按文本渲染；禁止 `dangerouslySetInnerHTML`、`eval` 和 `new Function`。Markdown 预览必须使用受控解析器，不能直接插入未清洗 HTML。
- 表单提交时在边界处校验必填项和格式；不要只依赖浏览器 `required` 或前端显示限制。

### 样式与依赖

- 使用 DSH 提供的 `--dsw-alias-*` token，不写纯黑或纯白硬编码状态色。
- CSS 私有类名使用 `zy-<component>-<element>`，并与 JSX 中的类名一一对应，例如 `zy-base-panel`、`zy-base-row`。
- 不修改 DSH 壳的私有 DOM，不自建路由、HTTP 服务或第二套工作台；不把 React 打包进 Client。
- 单个源文件遵守 300 行限制；超过时按状态、展示、弹框、纯函数或样式职责拆分。

### React 交付检查

- 新增或修改组件时，至少覆盖适用的空态、加载态、错误态、无数据态和正常态。
- 修改 bridge、Host 命令或工具参数后，同时检查 RPC 字段和现有命名契约没有变化。
- 完成后执行以下检查；未实际执行的 UI/DSH 环境验收必须明确标记为待测：

  ```sh
  npm test
  npm run build
  git diff --check
  ```

## TypeScript 规则

适用于 `**/*.{ts,tsx}`。

### 文件与命名

- 非 React 的 TypeScript 模块使用 `kebab-case.ts`，例如 `command-parse.ts`、`host-resolve.ts`。
- React 组件文件使用 PascalCase，并与主要导出物一致，例如 `BasePage.tsx`、`KbSearchView.tsx`。
- 同一职责的多个展示组件可以使用有意义的复数名，例如 `Dialogs.tsx`、`Icons.tsx`；禁止使用无语义的 `utils.ts`、`helpers.ts`、`component.tsx`。
- 测试文件使用被测模块名加 `.test.ts`，例如 `search.test.ts`；测试夹具目录和文件名可以使用业务语言或中文，以便对应验收数据。
- 变量和函数使用 `camelCase`，类型、接口和 React 组件使用 `PascalCase`，真正的固定配置使用 `UPPER_SNAKE_CASE`。
- 命名必须表达业务语义，例如 `currentBaseId`、`baseRoot`、`absolutePath`、`relativePath`；不要使用不必要的 `abs`、`rel`、`dest`、`rec`、`tmp` 等缩写。

### 类型边界

- 保持 `strict`；禁止新增 `any`。
- 外部输入、JSON 和 Host/Client bridge 返回值优先使用 `unknown`，在边界处进行显式收窄。
- 领域 DTO 只维护一份；Client 需要别名时使用类型转出或别名，不复制字段定义。
- 导出的函数、类和公共类型写清楚返回类型；异步函数明确返回 `Promise<T>`。
- 优先使用判别联合表达成功/失败和状态，避免用一组相互依赖的可选字段表达同一状态。
- 类型断言只能放在已知边界（JSON、Host API、第三方类型不完整处），并紧邻运行时校验；不要用 `as` 掩盖不确定数据。
- import 本地 TypeScript 文件时保留项目要求的 `.ts` / `.tsx` 扩展名；类型依赖使用 `import type`。

### 外部契约与安全

- `dsh-zhiyuan`、`zhiyuan`、`knowledge`、`kb_*`、`baseId`、`destCategory`、RPC `path` 和 `relPath` 是已有契约。重命名内部变量前，先确认它不是持久化字段、命令 flag、工具 schema 或 RPC 字段。
- 所有来自命令、工具、bridge、文件系统和 JSON 的输入都必须在 Host 边界校验，不能只依赖 UI 校验。
- 文件路径必须经过库根 containment 和符号链接检查；禁止通过字符串拼接绕过路径校验。
- 不在日志、错误消息或测试输出中写入密钥、令牌和不必要的完整用户内容。
- 禁止 `eval`、`new Function` 和将不可信内容放进 HTML；文本默认按文本渲染。

### 异步与验证

- 每个异步调用都要有明确的错误路径；fire-and-forget 使用 `void promise.catch(...)` 或等价的集中错误处理。
- 不吞掉异常；只有在存在明确回退语义时才 `catch`，并说明回退原因。
- 修改 Host/Client 契约、文件路径、持久化结构或构建入口后，至少执行：

  ```sh
  npm test
  npm run build
  git diff --check
  ```

- 不要手工修改 `lib/` 生成物；先修改 `src/`，再通过构建同步生成物。
