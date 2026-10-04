# DOCX 转 Markdown：库调研与接入方案

> 日期：2026-09-01
> 序号：01（当日第一份）
> 修订：2026-09-02 — 去掉 PDF / Pandoc / 全家桶展开；接口改成可插拔 Converter；补全依赖组合、安全隔离和多输出落盘语义。
> 修订：2026-10-04 — 对齐现行代码：转换口已落地为 `contentRegistry.prepareImport → PreparedEntry[]`，不再另立 Converter / ConvertOutcome；目录、文件路径与测试结构改为现行分层；丢图改为 `transformDocument` 剔除；补 worker 发送前自检、孤儿退出、批量成本说明；§3.2 补 remark 备选。
> 定位：给知源「DOCX 导入」选库、定通用转换口。库内正文仍只落 `bases/<id>/` 下可检索文本。
> 对照：[04 导入](./2026-08-31-04-dsh-导入落柜与分类.md)、[03 XLSX/CSV](./2026-09-02-03-dsh-XLSX与CSV进库方案.md)。
> 性质：公开 npm / GitHub 二次整理 + 对照本仓库约束；**未对真实合同跑过转换，不声称质量验收通过**。

---

## 1. 一句话

检索只吃库里的文本。`.docx` 不能原样拷进库，必须在 **Host** 转成 Markdown 再走现有 ingest。

第一档只做 DOCX。转换层用一份与格式无关的口，xlsx / csv（已另档）和以后的格式都挂同一条 `prepareImport` 分叉，不各写一套落盘。

**推荐引擎**：自拼 `mammoth` + `@joplin/turndown` + `@joplin/turndown-plugin-gfm`。不装 Office / PDF 全家桶。

---

## 2. 选库前的约束

| 约束 | 对转换器的要求 |
|------|----------------|
| 转换只在 Host | 库必须能跑 Node ESM；禁止进 Client（`src/view`） |
| 拔网线仍能导入 | 禁止默认打 URL、CDN worker、云 OCR |
| 无 Python / 少原生 | 不要 LibreOffice、不要自研解 OOXML |
| 落盘后能被 ripgrep 扫到 | 产物是 `.md`，不留源 `.docx` |
| 单文件 5 MB、单库 10 GB | 源与写出各过一遍；配额对象是写出后的字节 |
| 模块 ≤300 行 | 新开 `src/formats/docx/`，不往 `service/kb/import` 堆解析；fork 隔离进 `src/platform/` |

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

三件都是纯 JS。Win / macOS / Linux（含 ARM）都能跑，和 DSH 桌面矩阵对齐。表中版本是 2026-09 快照，实现档锁定依赖时以 npm 复核为准。

mammoth 的 style-name 匹配的是 styles.xml 里样式的 `w:name`（大小写不敏感）。主流 Word（含中文版）内置标题的 `w:name` 仍是 `heading N`，默认映射通常已能命中；真正匹配不上的是 WPS 与改过名的模板，其 `w:name` 可能写作「标题 N」。显式补中英两套映射属于防御，逐行成本很低；实际样张仍以 `mammoth.messages` 和快照为准：

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

图片第一版丢掉。优先用 `transformDocument` 在转 HTML 前直接剔除 image 节点：HTML 里不产生 `<img>`，省掉占位与二次移除，也不为图片数据分配内存。若改走 `convertImage` 路线，注意回调必须返回含 `src` 的合法图片属性，不能「返回空」。无论哪条路线，最终 Markdown 不得留下 `![图]()` 或 data URI。base64 内嵌容易顶满 5 MB；grep 也搜不到图。

三包都作为直接运行时依赖写入 `package.json`，使用无 `^` 的精确版本，并提交更新后的 lockfile。`@joplin/turndown` / GFM 插件没有可直接使用的完整 TypeScript 类型时，在 `src/**/*.d.ts` 补最小模块声明；不得用 `any` 扩散到格式模块接口。

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
| `unified` / `remark` 管线 | `rehype-parse` + `remark-gfm` + `remark-stringify` 替代 turndown 三件套 | 列为**备选**不装：维护更活跃、TS 类型原生、AST 级剔图 / 链接过滤与转义更可靠；代价是依赖树大一截。若 Joplin fork 类型难补或行为难控，只换 `html-output-policy` 一个文件，口不变 |
| 自研解 zip + `document.xml` | — | 样式、编号、修订成本远高于 mammoth |

包装库换不来更好的 Word 语义，只多一层锁定和无关格式。引擎以后要换，换的是格式模块实现，不是 ingest。

---

## 4. 通用转换口（本档真正要钉死的）

ingest 不认「docx / xlsx / 以后某格式」。它只认两件事：**拷贝** 或 **转换后写出**。

**现状先行**：这一口已经落地。现行 `src/formats/host-contract.ts` 的 `SourceFormatHandler.prepareImport → PreparedEntry[]` 与本档初稿的 `Converter / ConvertOutcome` 语义一一对应。**本档不再定义平行类型**，唯一真相在 `src/formats/`；DOCX 只是往 `contentRegistry` 多注册一个源格式。

```
源文件（只读）
  → contentRegistry.prepareImport（按 sourceExtensions 路由）
  → PreparedEntry[]（1..N 个库内条目）
  → 逐 entry：配额 / 指纹 / 冲突 / 原子写
```

初稿概念 → 现行落点（字段定义不重复抄，唯一真相在 `formats/shared/ingest-output.ts` 与 `formats/host-contract.ts`）：

| 初稿概念 | 现行落点 |
|----------|----------|
| `Converter.sourceExts` | `SourceFormatHandler.sourceExtensions`（重复后缀构建即抛错） |
| `ConvertOutcome.files[]` | `PreparedEntry[]`（一份源 1..N 个库内条目） |
| `ConvertedFile.destName` | `PreparedEntry.outputName`（仅文件名，写盘前复验） |
| 指纹哈希 | `PreparedEntry.digest`（转换产物哈希**写出字节**） |
| warnings | `PreparedEntry.warnings` |
| 转换实现 | 各格式模块的 `prepare*Import`；DOCX 为 `prepareDocxImport` |

| 规则 | 说明 |
|------|------|
| 注册表按源后缀查找 | `host-registry.ts` 静态注册；DOCX 新增一个 `ContentFormatModule`，import 编排不出现 `if (ext === '.docx')` |
| 库内可检索后缀 = `entryExtensions` | 现行 `EntryFormat`（markdown / csv），`searchGlobs()` 由此派生，初稿 `TEXT_EXTS` 说法作废。`PreparedEntry.format` 必须是 EntryFormat 值；DOCX 产物恒为 markdown 条目 |
| 输出名在 Ingest 复验 | `import-entry-writer.ts` 已验 basename、containment、symlink；**本档补**：outputName 扩展名必须 ∈ `entryExtensions`，不得因 sheet 名或未来 Converter 让产物逃出可检索白名单 |
| 保留目录由 Ingest 统一拼 | `outputRelativePath(sourceRelPath, sourceName, outputName)`；`preserveTree=true` 时 `子/a.docx → 子/a.md`，转换实现不接收或返回目标目录 |
| 指纹哈希**写出字节** | 同内容 skip；换引擎后同一源可能再进一份 `name-2.md`，可接受 |
| 多文件先算总字节再写 | 目标语义：任一超 5 MB、单源产物合计超 20 MB（为 xlsx 预留，DOCX 恒单 entry 不会触发）、整批超 10 GB → 整份源失败、已算的不落盘；先预留全部目标名、写同目录临时文件，全部成功后再 rename；写 / rename 失败时仅回滚本次新建文件。**现状是逐 entry 顺序写、失败不回滚已写 entry**；DOCX 单 entry 不受影响，回滚语义随 xlsx 档实现，不在本档堵 |
| 源只读、失败不落盘 | `writePreparedEntry` 临时文件 + rename + 写后字节 / digest 复验，已落地。一源多 output 的结果模型（`ImportFileResponse[]` + 源级聚合）已落地，初稿「须改为」的说法作废 |
| 警告给人看 | `mammoth.messages` → `PreparedEntry.warnings`（code + 安全的用户文案）→ `ImportResponse.warnings` 与工具输出；成功项也可带 warning。设置页需在导入结束后显示摘要，不能关闭弹框后丢失 |
| 错误不回显库原文 | `KbError(code, 通用文案)` 是稳定错误码通道；不得把可含源路径、文档内容或内部实现的异常原文塞进 `reason` |
| 超时与资源隔离 | 转换一律运行在新 Node 子进程，Host 在 30s 后强制终止（`Promise.race` 不是超时实现）；**子进程发送前自检产物大小，超限失败不发送**——fork 的 IPC 没有内建上限，等父进程收到再拒，大帧已物化在父进程内存；父进程逐帧复验并累计限制 20 MB 仅作兜底。各 OS 的 RSS 沙箱未落地前，不能把它宣传为已具备的安全保证 |

接入分叉（现行结构，无需新 if）：

```
importFiles → ingestOne → contentRegistry.prepareImport
  .docx 命中新 handler → prepareDocxImport（子进程隔离转换）→ 1 个 markdown PreparedEntry
  md / txt / csv       → 现有 prepare*Import（md/txt 拷贝，csv 严格解码）
  无 handler           → KbError ext_denied（列出允许的源后缀）
```

文件夹混进 md 与 docx：md 仍拷；docx 走转换；失败项不挡同批。现行 `ingestOne` 已按源聚合 `ImportFileResponse[]`，源级 `status`（成功 / 全跳过 / 失败）与 output 级 `copied` / `renamed` / `skipped` 两层已经分开；例如 xlsx 两张表一 skip 一 copy 的模型已经成立，DOCX 第一版恒一份 output，沿用同一模型，避免以后再破坏 API。

xlsx：初稿「另对齐一个 ConvertOutcome」作废，落地时直接返回 `PreparedEntry[]`（每表一个 csv 条目），不要为表格并存 `ConvertedTable` / `csvUtf8` 等平行接口。本档不实现表格，只把口留齐。以后若加 PDF：新开一个 `ContentFormatModule` 注册 `.pdf`。本档不为它预留空壳、不装解析器。

---

## 5. DOCX 转换怎么接

```ts
prepareDocxImport(context: PrepareImportContext): Promise<PreparedEntry[]>
// 恒为 1 个 entry：format = markdown，outputName = sourceName 去 .docx 加 .md
```

实现要点（都关在 `src/formats/docx/`，import 编排看不见 mammoth）：

1. 父进程按后缀路由后进入子进程；子进程内先复验常规文件与 5 MB 压缩源体积做快速拒绝，再执行 `mammoth.convertToHtml({ path }, { styleMap, externalFileAccess: false, transformDocument })`。
2. `transformDocument` 剔除 image 节点（见 §3.1）；`@joplin/turndown` + Joplin `tables` / `strikethrough` → markdown 字符串；`html-output-policy` 移除任何不在 allowlist 的链接。第一版只保留 `https:` 与 `mailto:`；**无协议的相对链接（内部锚、同目录引用）一律丢弃**；`javascript:`、`data:`、`file:` 及未知协议拒绝。
3. 返回 `[{ format: markdown, outputName, byteLength, digest: sha256(md 字节), content: { kind: 'bytes' }, warnings }]`；发送前自检产物大小。
4. 以 `KbError(code)` 和结构化 warning 回给 ingest；不回显库错误原文。

不要把 HTML 或源路径发给网络。不解出嵌入 OLE。第一版不抽图，但「源 zip 小于 5 MB」不能防 zip bomb 或病理解析，隔离和硬终止仍是必需项。

**批量成本**：第一版每源 fork 一次，单次冷启动约百毫秒级，相对多数真实 docx 的解析时间可接受；若批量导入中纯 fork 开销成为瓶颈，优化方向是批内复用 worker（每文件独立超时、连续失败即弃），不改口。

---

## 6. 安全边界与失败语义

DOCX 是 ZIP，且 `mammoth` 不对源文档做通用安全清洗。导入源即使来自本机，也按不可信输入处理：

- `externalFileAccess` 显式固定为 `false`；不读取文档引用的库外文件。
- 解析和转换后的 Markdown 都不得直通不受控渲染器。Host 在写盘前执行链接协议 allowlist 和图片 / 原始 HTML 清理；Client 的 Markdown 渲染器仍须保持自身的 XSS 防护，不能成为唯一防线。
- 子进程只接收已校验的绝对源路径、固定 descriptor 和固定转换选项；父进程用 `child_process.fork` 启动包内入口，禁用 shell，且不传用户控制的 module、参数或 `execArgv`。`serialization: 'advanced'` 本就是 fork 默认值，显式写出仅作契约固化。不得把不可信字段拼进命令，也不执行文档内宏、OLE、外部命令或脚本。
- worker 协议仅允许已定义的 request / diagnostics / `outputName + bytes` / done 帧；**子进程发送前自检产物大小，超限直接失败不发送**；父进程在接受每帧前复验类型、文件名和字节数，并累计限制为 20 MB 作兜底。子进程不写库；父进程收到完整、受限的结果后才交给 ingest 落盘。
- 子进程监听 IPC `disconnect` 自动退出，防 Host 异常退出后遗留孤儿转换进程；Host 侧 fork 挂在可卸载的 effect 上（项目约束：每个注册、订阅、timer、slot 都必须可卸载）。
- 失败不创建库内正文；转换 warning 不改变成功状态，但必须在 UI 与 `kb_ingest` 结果中可见。源文件更新后若写出字节变化，现有「同名不同指纹改名」语义仍产生 `name-2.md`，不伪装成覆盖更新。

---

## 7. 模块怎么切

目标文件 ≤300 行。格式解析库只允许出现在各格式的子进程入口；注册表、import 编排和其余模块都不 import `mammoth`、XLSX / PDF 库或任何格式解析器。目录对齐现行分层：

```text
src/
├── model/
│   └── content-contract.ts        # SourceFormat 增加 Docx: 'docx'；EntryFormat 不动（产物是 markdown 条目）
├── platform/
│   ├── convert-protocol.ts        # 父进程与转换子进程共用的有限消息类型；不 import 格式库
│   └── convert-worker.ts          # fork、30s 硬终止、发送前自检契约、断连自退；不 import 格式库
├── formats/
│   ├── host-contract.ts           # 现行口，不动：SourceFormatHandler.prepareImport → PreparedEntry[]
│   ├── host-registry.ts           # 现行口，不动：CONTENT_FORMAT_MODULES 增加一个模块
│   ├── shared/
│   │   ├── ingest-output.ts       # PreparedEntry / writePreparedEntry（现有）
│   │   └── html-output-policy.ts  # 链接 allowlist、剔图、原始 HTML 策略；与具体格式解耦
│   ├── markdown/ …                # 现有
│   ├── csv/ …                     # 现有
│   └── docx/
│       ├── docx-format.ts         # 注册面：sourceHandlers(['.docx'])；无 entryHandler（产物是 markdown 条目）
│       ├── style-map.ts           # 中英 Heading 1～6
│       └── worker.ts              # DOCX 子进程入口；仅此处 import mammoth / turndown
├── service/kb/import/…            # 现行编排与聚合；不 import mammoth
└── view/settings/…                # PrefsPage.tsx 勾 DOCX；ImportDialog.tsx 摘要含 docx 文案
```

Host 调用方向固定为：`service/kb/import → formats/host-registry → formats/docx/docx-format → platform/convert-worker → formats/docx/worker（子进程）→ formats/shared/ingest-output`。`docx-format.ts` 只暴露内部硬编码的 descriptor（worker 产物名、sourceExtensions），不接收用户给的模块路径、库名或入口文件名；扩展名只能命中受信任实现，不能驱动动态 import 或 shell。

每种已支持格式各有一个单独的子进程构建产物，而不是一个会 import 全部解析库的总入口：DOCX 为 `lib/convert-docx-worker.js`。`platform/convert-worker.ts` 用 `child_process.fork(fileURLToPath(new URL('./convert-docx-worker.js', import.meta.url)))` 启动由注册模块声明的受信任产物，stdio 走 IPC、不使用 shell。这样 XLSX 的依赖不会进入普通 Markdown、CSV 或 DOCX 路径；将来启用 XLSX / PDF 时，才新增 `formats/xlsx/worker.ts` 或 `formats/pdf/worker.ts` 与各自构建产物，可以选用完全不同的库。

| 文件 | 职责 |
|------|------|
| `src/model/content-contract.ts` | `SourceFormat.Docx` 新值；EntryFormat 与各守卫不动 |
| `src/platform/convert-protocol.ts` / `convert-worker.ts` | 帧契约、fork 隔离、30s 硬终止、断连自退；不 import 格式库 |
| `src/formats/shared/html-output-policy.ts` | Joplin Turndown + GFM；链接 / 图片 / 原始 HTML 策略；与 DOCX 解耦 |
| `src/formats/docx/docx-format.ts` / `style-map.ts` / `worker.ts` | 注册面、中英 styleMap；Worker 内 mammoth + 剔图；实现 DOCX 的隔离转换 |
| `src/formats/shared/ingest-output.ts` | `PreparedEntry` / 原子写（现有）；本档在 `service/kb/import/import-entry-writer.ts` 补输出扩展名复验 |
| `src/service/kb/import/*` | 现行编排、聚合与结果模型；**不 import mammoth** |
| `src/view/settings/PrefsPage.tsx` | DOCX 勾上（disabled checked，与 md 一样表示「已开」） |
| `src/view/settings/SettingsSection.tsx` / `dialogs/ImportDialog.tsx` | 导入完成后显示 copied / skipped / failed 与每项 warning；支持格式文案含 docx |
| `scripts/build.mjs` / `package.json` | `convert-docx-worker` 作为独立 esbuild entry 产出 `lib/convert-docx-worker.js`，并加入 `files` 与随包发布；不能只写 `src` 文件 |

不要：`src/parsers/*` 或 `formats/pdf/` 预留 PDF 空壳；不要 Client 调 mammoth；不往 `service/kb/import` 堆格式逻辑。

测试维持镜像发现规则（test/ 与 src/ 同构）：新增 `test/formats/docx.test.ts`（fixture 转换、样式映射、链接与图片策略、多 output 模型）与 `test/platform/convert-worker.test.ts`（超时终止、帧限额、断连自退）；现行 `test/service/kb/import.test.ts` 补 md + docx 混合批次用例。PDF 开档时再增同级测试与 fixture。

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
- [ ] 恶意链接（`javascript:` / `data:` / `file:`）和无协议相对链接 → 输出中不存在；`https:` / `mailto:` 仍可保留
- [ ] 高压缩比 ZIP、超大表格或病理样式：30s 后由父进程终止，Host 未卡死、库内无新文件
- [ ] 子进程产物超限：发送前失败，不发送大帧，父进程 20 MB 累计兜底不被击穿
- [ ] 多 output 的 Converter：先预检全部配额；模拟第二次写入失败，已新建 output 全部回滚，既有文件不受影响（随 xlsx 档验收，DOCX 恒单 output 不阻塞本档）
- [ ] `mammoth.messages` 既在 Host / 工具结果返回，也在设置页导入摘要可见；异常原文不泄露给用户
- [ ] 偏好勾 DOCX；选文件能点到 `.docx`
- [ ] 断网：本机 docx 仍能导入
- [ ] 现行 `npm test` 全绿：docx 接入不回归 import / format-registry 既有用例（一源多 output 已是现网行为）

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
- unified / remark（备选管线，不装）：https://github.com/remarkjs/remark
- 表格进库另见：[03 XLSX/CSV](./2026-09-02-03-dsh-XLSX与CSV进库方案.md)
