# DOCX 转 Markdown：库调研与接入方案

> 日期：2026-09-01  
> 序号：01（当日第一份）  
> 修订：2026-09-02 — 去掉 PDF / Pandoc / 全家桶展开；接口改成可插拔 Converter；补全依赖组合、安全隔离和多输出落盘语义。  
> 定位：给知源「DOCX 导入」选库、定通用转换口。库内正文仍只落 `bases/<id>/` 下可检索文本。  
> 对照：[04 导入](./2026-08-31-04-dsh-导入落柜与分类.md)、[03 XLSX/CSV](./2026-09-02-03-dsh-XLSX与CSV进库方案.md)。  
> 性质：公开 npm / GitHub 二次整理 + 对照本仓库约束；**未对真实合同跑过转换，不声称质量验收通过**。

---

## 1. 一句话

检索只吃库里的文本。`.docx` 不能原样拷进柜，必须在 **Host** 转成 Markdown 再走现有 ingest。

第一档只做 DOCX。转换层用一份与格式无关的口，xlsx / csv（已另档）和以后的格式都挂同一条 `ingestOne` 分叉，不各写一套落盘。

**推荐引擎**：自拼 `mammoth` + `@joplin/turndown` + `@joplin/turndown-plugin-gfm`。不装 Office / PDF 全家桶。

---

## 2. 选库前的约束

| 约束 | 对转换器的要求 |
|------|----------------|
| 转换只在 Host | 库必须能跑 Node ESM；禁止进 `src/client` |
| 拔网线仍能导入 | 禁止默认打 URL、CDN worker、云 OCR |
| 无 Python / 少原生 | 不要 LibreOffice、不要自研解 OOXML |
| 落盘后能被 ripgrep 扫到 | 产物是 `.md`，不留源 `.docx` |
| 单文件 5 MB、单库 10 GB | 源与写出各过一遍；配额对象是写出后的字节 |
| 模块 ≤300 行 | 新开 `src/convert/`，不往 `ingest.ts` 堆解析 |

`.doc`（OLE）、加密、带宏、纯扫描件当图：第一版失败并写原因。PDF / pptx 本档不选库、不写实现。

---

## 3. 库调研（2026-09）

几乎所有「DOCX→MD」的 npm 包都叠在同一条管道上。差别是自己拼，还是买一层包装（再顺带 PDF / xlsx / OCR）。

```
.docx (zip + word/document.xml)
        →  mammoth（语义 HTML，不抄字体颜色）
        →  turndown + GFM 表
        →  .md
```

mammoth 自带的 `convertToMarkdown` **已弃用**，官方明确：先 HTML，再用别的库转 MD。

### 3.1 推荐：自拼三件套

| 包 | 角色 | 版本 / 许可 | 为什么够用 |
|----|------|-------------|------------|
| `mammoth` | DOCX→干净 HTML | 1.12.2，BSD-2 | 工业级、无原生、无联网；样式按语义映射 |
| `@joplin/turndown` | HTML→Markdown | 4.0.85，MIT | 与下行 Joplin GFM 插件成对使用；会移除 JavaScript 链接 |
| `@joplin/turndown-plugin-gfm` | GFM 表 / 删除线 | 1.0.67，MIT | Joplin 在维护。**不加则表格标记会被剥掉** |

三件都是纯 JS。Win / macOS / Linux（含 ARM）都能跑，和 DSH 桌面矩阵对齐。

中文 Word 文档常把内置标题保存为「标题 N」，而英语文档常为 `Heading N`。显式映射两者，并覆盖 1～6 级；实际样张仍以 `mammoth.messages` 和快照为准：

```
p[style-name='标题 1'] => h1:fresh
p[style-name='标题 2'] => h2:fresh
p[style-name='标题 3'] => h3:fresh
p[style-name='标题 4'] => h4:fresh
p[style-name='标题 5'] => h5:fresh
p[style-name='标题 6'] => h6:fresh
p[style-name='Heading 1'] => h1:fresh
p[style-name='Heading 2'] => h2:fresh
p[style-name='Heading 3'] => h3:fresh
p[style-name='Heading 4'] => h4:fresh
p[style-name='Heading 5'] => h5:fresh
p[style-name='Heading 6'] => h6:fresh
```

`mammoth` 默认样式映射不能替代这份显式约定；中英混排两边都要。

图片第一版丢掉。`convertImage` 的回调必须返回含 `src` 的合法图片属性，不能“返回空”；先返回一个无网络占位 `src`，再由 Turndown 的 `img` 规则移除整张图片，最终 Markdown 不得留下 `![图]()` 或 data URI。base64 内嵌容易顶满 5 MB；grep 也搜不到图。

三包都作为直接运行时依赖写入 `package.json`，使用无 `^` 的精确版本，并提交更新后的 lockfile。`@joplin/turndown` / GFM 插件没有可直接使用的完整 TypeScript 类型时，在 `src/**/*.d.ts` 补最小模块声明；不得用 `any` 扩散到 Converter 接口。

### 3.2 看过、不装

| 选项 | 本质 | 不选 |
|------|------|------|
| `word-to-markdown` | 同一管道 + prettier / markdownlint | 周下载约 40；默认 base64 内嵌图；Node ≥ 22.13。图片三态和 styleMap 可抄，不必装包 |
| `@aidalinfo/office-to-markdown` | 同一管道 + OMML→LaTeX | 偏 Bun，生态未验证 |
| `officeparser` / `markitdown-ts` | 全家桶（PDF / OCR / xlsx / `ai`） | 为一篇 Word 引入原生 canvas、有洞的 `xlsx@0.18.5`、或 pdfjs + tesseract。与「本档不做 PDF」冲突 |
| Pandoc / `pandoc-wasm` | 质量通常最好 | Haskell 二进制或 ~15 MB GPL wasm。第一档要零本机依赖、包要小，不值 |
| `undocx` | Rust / Python | 无 Node 入口；禁止 Python |
| `@markitdownjs/docx` | 新 TS AST | 2026-06 上架，周下载个位数 |
| 只用 `mammoth.convertToMarkdown` | 官方弃用 | 表格 / 清洗弱于 HTML→turndown |
| 自研解 zip + `document.xml` | — | 样式、编号、修订成本远高于 mammoth |

包装库换不来更好的 Word 语义，只多一层锁定和无关格式。引擎以后要换，换的是 Converter 实现，不是 ingest。

---

## 4. 通用转换口（本档真正要钉死的）

ingest 不认「docx / xlsx / 以后某格式」。它只认两件事：**拷贝** 或 **转换后写出**。

```
源文件（只读）
  → 按后缀查 Converter
  → ConvertOutcome.files[]
  → 每个文件：配额 / 指纹 / 冲突 / writeFile
```

```ts
/** 一份源可能写出 1..N 个库内文件（docx=1 个 md；xlsx=每表一个 csv）。 */
type ConvertedFile = {
  /** 仅文件名；Ingest 在写盘前再次验证，Converter 不能自行决定目录。 */
  destName: string
  bytes: Buffer
  warnings: string[]
}

type ConvertOutcome = {
  files: ConvertedFile[]
}

type Converter = {
  sourceExts: readonly string[]
  convert(sourcePath: string): Promise<ConvertOutcome>
}
```

| 规则 | 说明 |
|------|------|
| 注册表按源后缀查找 | `CONVERT_EXTS` 由各 Converter 的 `sourceExts` 汇总，禁止在 `ingest.ts` 手写 `if (ext === '.docx')` |
| 库内可检索后缀仍是 `TEXT_EXTS` | `.md` / `.txt` / `.markdown`；csv 由 03 档另加。Converter 的 `destName` 必须落在 `TEXT_EXTS` 里 |
| 输出名在 Ingest 复验 | `destName` 必须等于其 basename、不得含 `/`、`\\`、NUL 或 `.` / `..`，且扩展名在 `TEXT_EXTS`；不得因 xlsx sheet 名或未来 Converter 让路径逃出库根 |
| 保留目录由 Ingest 统一拼 | Converter 只返回文件名。`preserveTree=true` 时，Ingest 用源相对目录加上 `destName`，故 `子/a.docx → 子/a.md`；不得让 Converter 接收或返回目标目录 |
| 指纹哈希**写出字节** | 同内容 skip；换引擎后同一源可能再进一份 `name-2.md`，可接受 |
| 多文件先算总字节再写 | 任一超 5 MB、单源转换产物合计超 20 MB、或整批超 10 GB → 整份源失败、已算的不落盘；先预留全部目标名、写同目录临时文件，全部成功后再 rename；写/rename 失败时仅回滚本次新建文件 |
| 源只读、失败不落盘 | 与 04 一致。`ingestOne` 的返回模型须改为“一个源 + 多个 output 结果”，再由外层按 output 计 copied / renamed / skipped，不能沿用当前一源一 `IngestFileResult` 的假设 |
| 警告给人看 | 将 `mammoth.messages` 映射为结构化 warning（code + 安全的用户文案）；成功项也可带 warning。设置页需在导入结束后显示摘要；工具输出也要带 warning，不能关闭弹框后丢失 |
| 错误不回显库原文 | 对用户和工具返回稳定错误码及通用文案；不得把可含源路径、文档内容或内部实现的异常原文塞进 `reason` |
| 超时与资源隔离 | Converter 一律运行在新 Node 子进程，Host 在 30s 后强制终止；`Promise.race` 不是超时实现。子进程的 V8 堆可设保守值，但它**不是** RSS 上限；父进程还须限制源、声明范围和 IPC 合计 20 MB。真正在各 OS 限制 RSS 的沙箱未落地前，不能把它宣传为已具备的安全保证 |

`ingestOne` 分叉：

```
registry 有对应 Converter  → converter.convert → 按 files[] 走指纹 / 改名 / writeFile
后缀 ∈ TEXT_EXTS         → 现逻辑（md/txt/markdown：copyFile）
否则                     → failed，reason 列出允许的源后缀
```

文件夹混进 md 与 docx：md 仍拷；docx 走转换；失败项不挡同批。

一个转换源可以有多个 output，因此结果模型须区分两层：源级 `status`（成功 / 全跳过 / 失败）和 output 级 `copied` / `renamed` / `skipped`。例如一本 xlsx 有两张表，一张与既有内容同指纹而另一张写入，源级为成功、output 级分别为 skipped 与 copied。DOCX 第一版恒一份 output，仍走同一模型，避免以后再破坏 API。

xlsx / csv 已在 [03](./2026-09-02-03-dsh-XLSX与CSV进库方案.md) 对齐为同一个 `ConvertOutcome`。落地时只在 `convert/types.ts` 定义这一套类型，不要为表格再并存 `ConvertedTable` / `csvUtf8` 等平行接口。本档不实现表格，只把口留齐。

以后若加 PDF：新开一个 Converter，注册 `.pdf`，仍返回 `ConvertOutcome`。本档不为它预留空壳、不装解析器。

---

## 5. DOCX Converter 怎么接

```ts
convertDocx(sourcePath: string): Promise<ConvertOutcome>
// 恒为 1 个文件：destName = basename 去 .docx 加 .md
```

实现要点（都关在 `src/convert/docx/`，ingest 看不见 mammoth）：

1. 父进程先以扩展名、常规文件和 5 MB 压缩源体积做快速拒绝；解析专属子进程内再执行 `mammoth.convertToHtml({ path }, { styleMap, externalFileAccess: false, convertImage })`。
2. `@joplin/turndown` + Joplin `tables` / `strikethrough` → markdown 字符串；增加规则移除 `img` 和任何不在 allowlist 的链接。第一版只保留 `https:` 与 `mailto:`，丢弃 `javascript:`、`data:`、`file:` 及未知协议。
3. `files: [{ destName, bytes: Buffer.from(md, 'utf8'), warnings }]`
4. 以结构化错误和 warning 回给 ingest；不回显库错误原文。

不要把 HTML 或源路径发给网络。不解出嵌入 OLE。第一版不抽图，但“源 zip 小于 5 MB”不能防 zip bomb 或病理解析，隔离和硬终止仍是必需项。

---

## 6. 安全边界与失败语义

DOCX 是 ZIP，且 `mammoth` 不对源文档做通用安全清洗。导入源即使来自本机，也按不可信输入处理：

- `externalFileAccess` 显式固定为 `false`；不读取文档引用的库外文件。
- 解析和转换后的 Markdown 都不得直通不受控渲染器。Host 在写盘前执行链接协议 allowlist 和图片/原始 HTML 清理；Client 的 Markdown 渲染器仍须保持自身的 XSS 防护，不能成为唯一防线。
- 子进程只接收已校验的绝对源路径、固定 descriptor 和固定转换选项；父进程用 `child_process.fork` 启动包内入口，禁用 shell，且不传用户控制的 module、参数或 `execArgv`。不得把不可信字段拼进命令，也不执行文档内宏、OLE、外部命令或脚本。
- IPC 仅允许已定义的 request / diagnostics / `destName + bytes` / done 帧；父进程在接受每帧前复验类型、文件名和字节数，并累计限制为 20 MB。子进程不写库；父进程收到完整、受限的结果后才交给 `ingest-output`。
- 失败不创建库内正文；转换 warning 不改变成功状态，但必须在 UI 与 `kb_ingest` 结果中可见。源文件更新后若写出字节变化，现有“同名不同指纹改名”语义仍产生 `name-2.md`，不伪装成覆盖更新。

---

## 7. 模块怎么切

目标文件 ≤300 行。格式库只允许出现在各格式的子进程入口；普通文本导入路径、注册表和 `ingest.ts` 都不 import `mammoth`、XLSX/PDF 库或任何格式解析器。

```text
src/
├── ingest.ts                    # 遍历源、聚合源级结果；不处理格式细节
├── ingest-output.ts             # 输出名复验、配额/哈希预检、临时写入、rename、回滚
└── convert/
    ├── types.ts                 # ConverterDescriptor / ConvertOutcome / diagnostics
    ├── registry.ts              # 受信任的 ext → descriptor 静态表
    ├── run-isolated.ts          # Host 侧 fork、30s 终止、V8/IPC 限制
    ├── worker-protocol.ts       # 父进程与转换子进程共用的有限消息类型
    ├── html/
    │   ├── md-from-html.ts      # @joplin/turndown + GFM 配置
    │   └── output-policy.ts     # 链接 allowlist、移除图片和原始 HTML
    ├── docx/
    │   ├── style-map.ts         # 中英 Heading 1～6
    │   └── worker.ts            # DOCX 子进程入口；仅此处 import mammoth
    ├── csv/
    │   ├── encoding.ts          # BOM/UTF-8/UTF-16/GB18030 的严格解码与文本校验
    │   └── worker.ts            # CSV 子进程入口；仅转换编码、不 import XLSX 库
    └── xlsx/
        ├── sheet-to-csv.ts      # 限制 worksheet 范围后调用库的 sheet_to_csv
        └── worker.ts            # XLSX 子进程入口；仅此处 import 经审计的 XLSX 库
```

Host 调用方向固定为：`ingest.ts → registry.ts → run-isolated.ts → 格式专属子进程 → ingest-output.ts`。`registry.ts` 只暴露内部硬编码的 descriptor（包括 `id`、`sourceExts`、对应子进程产物名），不得接收用户给的模块路径、库名或入口文件名；因此扩展名只能选择受信任的实现，不能驱动动态 import 或 shell。

每种已支持格式各有一个单独的子进程构建产物，而不是一个会 import 全部解析库的总入口：DOCX、CSV、XLSX 分别为 `lib/convert-docx-worker.js`、`lib/convert-csv-worker.js`、`lib/convert-xlsx-worker.js`。`run-isolated.ts` 用 `child_process.fork(fileURLToPath(new URL('./convert-<id>-worker.js', import.meta.url)))` 启动由 registry 选出的受信任产物，并固定 `serialization: 'advanced'`、stdio IPC 与非用户控制的 `execArgv`；不使用 shell。这样 XLSX 的依赖不会进入普通 Markdown、CSV 或 DOCX 路径；将来启用 PDF 时，才新增 `src/convert/pdf/worker.ts` 和 `lib/convert-pdf-worker.js`，PDF 可以选用完全不同的库。

| 文件 | 职责 |
|------|------|
| `src/convert/types.ts` | `ConvertedFile` / `ConvertOutcome` / `Converter` |
| `src/convert/registry.ts` | `sourceExt → Converter`；导出 `CONVERT_EXTS` |
| `src/convert/run-isolated.ts` / `worker-protocol.ts` | Host 侧子进程隔离、硬终止及固定、限长 IPC 契约；不 import 格式库 |
| `src/convert/html/md-from-html.ts` / `output-policy.ts` | Joplin Turndown + GFM；链接/图片/原始 HTML 策略；与 DOCX 解耦 |
| `src/convert/docx/style-map.ts` / `worker.ts` | 中英 styleMap；Worker 内 mammoth + 丢图；实现 DOCX 的隔离转换 |
| `src/convert/csv/encoding.ts` / `worker.ts` | 严格解码、换行与文本安全校验；不 import XLSX 库；实现 CSV 的隔离转换 |
| `src/convert/xlsx/sheet-to-csv.ts` / `worker.ts` | 限制 sheet 范围后转 CSV；Worker 内唯一 import 经过审计的 XLSX 库 |
| `src/ingest-output.ts` | 输出名复验、预检、原子写入与回滚；copy 和 convert 共用 |
| `src/identity.ts` | `TEXT_EXTS` 仍只表示**库内可检索后缀**；`CONVERT_EXTS` 从 registry 来，不要在这里手写一份 |
| `src/ingest.ts` | §4 分叉、遍历和源级结果聚合；**不 import mammoth** |
| `src/search-csv.ts` | RFC 4180 解析与物理行号映射、列名 excerpt；属于检索展示，不放进 Converter |
| `src/search.ts` | 统一使用 `SEARCH_GLOBS`；仅分派 CSV excerpt 格式化 |
| `src/pick-source.ts` | 文件对话框加上 `*.docx;*.csv;*.xlsx` |
| `src/client/settings/PrefsPage.tsx` | DOCX、CSV、XLSX 勾上（disabled checked，与 md 一样表示「已开」） |
| `src/client/settings/SettingsSection.tsx` / `AdditionalDialogs.tsx` | 导入完成后显示 copied / skipped / failed 与每项 warning；支持格式文案含 docx/csv/xlsx |
| `scripts/build.mjs` / `package.json` | 分别构建并随包发布三个 Worker；未来每种格式各增加一个 Worker 产物，不能只写 `src` 文件 |

不要：`src/parsers/*` 预留 PDF 空壳；不要 `chunks` 表；不要 Client 调 mammoth。

测试文件维持当前 `test/*.test.ts` 的扁平发现规则：新增 `test/convert-docx.test.ts`、`test/convert-csv.test.ts`、`test/convert-xlsx.test.ts`、`test/convert-runner.test.ts`、`test/ingest-output.test.ts`、`test/search-csv.test.ts`，不要新建 `test/convert/` 却忘记同步修改 test script。PDF 开档时再增加同级 `test/convert-pdf.test.ts` 与 PDF fixture。

---

## 8. 保真（导入成功 ≠ 版式还原）

mammoth 只认**语义样式**，不抄页面布局。工作台 / Skill / 关于页要说清。

| 能保 | 弱或丢 | 直接失败 |
|------|--------|----------|
| 标题（含映射后的「标题 N」） | 文本框 / 艺术字 / SmartArt | 不是合法 zip / 不是 docx |
| 段落、粗斜体、删除线 | 修订痕迹（需样张确认） | 加密 / 权限保护 |
| 有序 / 无序清单 | 复杂多级编号 | `.doc` |
| GFM 管道表（简单行列） | 合并单元格、嵌套表 | 转换超时 |
| 超链接、脚注 / 尾注 | 页眉页脚、批注、OMML 公式 | — |

---

## 9. 验收（实现档才勾）

- [ ] 最小 fixture（标题、列表、表、中文与英文 Heading 1～6、超链接）→ md 快照
- [ ] 非法字节 / `.doc` → `failed`，库内无新文件
- [ ] 同文档转两次 → 第二次 skip（md 指纹）
- [ ] 文件夹混 md + docx 且 `preserveTree=true`：两种都进，目录与后缀都对
- [ ] 恶意链接（`javascript:` / `data:` / `file:`）和图片 → 输出中不存在；`https:` / `mailto:` 仍可保留
- [ ] 高压缩比 ZIP、超大表格或病理样式：30s 后由父进程终止，Host 未卡死、库内无新文件
- [ ] 多 output 的 Converter：先预检全部配额；模拟第二次写入失败，已新建 output 全部回滚，既有文件不受影响
- [ ] `mammoth.messages` 既在 Host / 工具结果返回，也在设置页导入摘要可见；异常原文不泄露给用户
- [ ] 偏好勾 DOCX；选文件能点到 `.docx`
- [ ] 断网：本机 docx 仍能导入

---

## 10. 本档不写进代码的

- PDF / pptx / OCR、库内保留源 `.docx`  
- 装 officeparser / markitdown-ts / Pandoc / Python  
- 为「以后方便」预留空解析器  
- 把转换放到 Client 或自建 HTTP  
- 对话区芯片、自动归类、FTS  

---

## 11. 参考

- mammoth：https://github.com/mwilliamson/mammoth.js  
- Joplin Turndown：https://www.npmjs.com/package/@joplin/turndown
- Joplin GFM：https://www.npmjs.com/package/@joplin/turndown-plugin-gfm  
- word-to-markdown（对照管道，不装）：https://github.com/benbalter/word-to-markdown-js  
- 表格进库另见：[03 XLSX/CSV](./2026-09-02-03-dsh-XLSX与CSV进库方案.md)
