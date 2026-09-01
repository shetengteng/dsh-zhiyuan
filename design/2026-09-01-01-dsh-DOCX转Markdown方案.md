# DOCX 转 Markdown：库调研与接入方案

> 日期：2026-09-01  
> 序号：01（当日第一份）  
> 定位：给知源下一档「DOCX 导入」选库、定管道，不改现有漏斗与原文货架。  
> 对照：[01 可行性](./2026-08-30-01-dsh-知识库插件可行性方案.md) §4.5（`.docx` 后做）、[04 导入](./2026-08-31-04-dsh-导入落柜与分类.md)、[06 实施计划](./2026-08-31-06-dsh-知识库MVP实施计划.md)、[07 待办](./2026-08-31-07-dsh-知识库MVP待办.md)（换档才开 PDF / DOCX）。  
> 性质：公开 npm / GitHub 文档二次整理 + 对照本仓库约束；**未对真实合同样张跑过转换，不声称质量验收通过**。  
> 不改：工具名、先选库再搜、正文只落 `bases/<id>/` 下的 `.md`。

---

## 1. 一句话

知源检索只吃文件夹里的 `.md` / `.txt`。DOCX 不能原样拷进库，必须在 **Host** 转成 Markdown 再走现有 ingest。TS/JS 里真正干活的几乎都是同一条管道：**mammoth（DOCX→HTML）+ turndown（HTML→MD）**。本档推荐直接装这两块，再加 GFM 表格插件；不装万能「Office 全家桶」。

---

## 2. 本仓库约束（选库前先钉死）

| 约束 | 来源 | 对转换器的要求 |
|------|------|----------------|
| 转换只在 Host | 插件规则：浏览器没有 `ctx.tools`；建库 / 导入走主进程 | 库必须能跑 Node ESM，禁止塞进 `src/client` |
| 拔网线仍能导入 | 01 / 07 | 禁止默认打 URL、CDN worker、云 OCR |
| 禁止 `workspace:`、少原生绑定 | 插件规则、01 §4.3 | 不要 Python / LibreOffice。Pandoc 可行，但受官方二进制矩阵与体积约束，见 §5.4 |
| 落盘后必须能被 ripgrep 扫到 | 06 / `search.ts` | 产物是 `.md`，不是 `.docx`；不要把正文只放进 AST |
| 单文件 5 MB、单库 10 GB | catalog `prefs` | 配额按**落盘后的 md**计；源 docx 也先过 5 MB，超了该项失败 |
| 工作台不扫盘、不当网盘 | 06 §6 | Client 只交路径；转换进度走已有 `jobs` 队列 |
| 模块 ≤300 行 | 仓库规则 | 新开转换模块，不往 `ingest.ts` 堆 |
| 偏好页 DOCX 现在置灰 | `PrefsPage.tsx` | 本档落地后才勾上；PDF 仍灰 |

`.doc`（OLE 老格式）不在范围内。现有 JS 库认的是 OOXML zip（`.docx`）。加密、带宏、纯扫描件当图的 Word，本档第一版允许失败并写原因。

---

## 3. 转换在管道里的位置

现在 `ingestOne`：白名单 → 体积 → sha256 → 拷贝。DOCX 插在「白名单通过」和「指纹 / 拷贝」之间：

```
源 .docx（只读）
  → Host 转成 markdown 字符串 + 可选图片字节
  → 写成 bases/<id>/<类目>/<原名>.md
  → 指纹 / 冲突 / 配额走现有逻辑（对象是这段 md，不是源 zip）
```

| 决策 | 取舍 |
|------|------|
| 库里不留 `.docx` | 预览、试搜、命中卡都已经按 md 写；留双份会让 grep 漏或重复 |
| 指纹哈希**转换后的 md** | 同内容 skip；换转换器后同一源可能再进一份（改名 `name-2.md`），可接受 |
| 源文件只读 | 与 04 一致；失败不落盘 |
| 图片第一版丢掉 | grep 搜不到图；base64 会把一篇合同撑过 5 MB。占位写成 `![图]()` 或省略 |
| 警告给人看 | mammoth 的 `messages`（未映射样式等）进该项 `reason` 或结果旁注，不当成功静默 |

文件夹导入：目录里混有 md 与 docx 时，md 仍拷贝；docx 逐个转；已失败项不挡同批其他文件。

---

## 4. 库怎么分类

几乎所有「DOCX→MD」的 npm 包都叠在 mammoth 上。差别是：**自己拼管道，还是买一层包装（再顺带 PDF/XLSX/OCR）**。

```
.docx (zip + word/document.xml)
        │
        ▼
   mammoth / 自研 OOXML AST
        │
        ▼
      HTML 或 AST
        │
        ▼
 turndown (+ GFM 表) 或自研 MD 生成器
        │
        ▼
      .md 文本
```

Pandoc 转换质量通常最好。它不是 TS 库，是 Haskell 二进制（另有官方 `pandoc.wasm`）。平台能不能覆盖齐，见 §5.4；不再一句话否决。

---

## 5. 候选对照（2026-09 公开数据）

下载量为当时 npm 周下载，会变；用来分「工业级 / 薄包装 / 实验」，不当验收。

### 5.1 推荐自拼：mammoth + turndown

| | **mammoth** | **turndown** |
|--|-------------|--------------|
| 包 | `mammoth` | `turndown` |
| 角色 | DOCX→干净 HTML（按样式语义，不抄字体颜色） | HTML→Markdown |
| 版本 / 更新 | 1.12.2（2026-08-28） | 7.x，长期维护 |
| 许可 | BSD-2-Clause | MIT |
| 周下载 | ~780 万 | 量级同档（生态标配） |
| 原生 / 联网 | 无 | 无 |
| 表格 | HTML `<table>` 能出 | **必须**加 GFM 插件，否则表格标记会被剥掉 |
| 图片 | 默认可 data URI；可用 `convertImage` 抽文件或丢掉 | 跟着 `<img>` 走 |
| 作者态度 | **自带 `convertToMarkdown` 已弃用**，明确叫你 HTML 再转 MD | — |

GFM 插件不要用停更的 `turndown-plugin-gfm`（2017）。用 **`@joplin/turndown-plugin-gfm`**（Joplin 在养；`markitdown-ts`、`word-to-markdown` 也是这个）。

中文 Word 默认样式是「标题 1」不是 `Heading 1`。必须带 styleMap，否则正文全是段落、grep 看不到结构：

```
p[style-name='标题 1'] => h1:fresh
p[style-name='标题 2'] => h2:fresh
p[style-name='标题 3'] => h3:fresh
p[style-name='标题 4'] => h4:fresh
```

mammoth 同时认 `Heading 1` 默认表，中英混排文档两边都要。

### 5.2 薄包装（同一管道，多一层 API）

| 包 | 周下载（约） | 许可 | 多出来的东西 | 为何不首选 |
|----|--------------|------|--------------|------------|
| `word-to-markdown`（benbalter） | 43 | ISC | markdownlint / prettier 清洗；图片 extract/strip；要 **Node ≥ 22.13** | 下载极低；清洗器重；我们已有 Node 22 类型但不必绑死小版本 |
| `@aidalinfo/office-to-markdown` | ~500 | MIT | OMML→LaTeX；偏 Bun | 新、依赖面小但生态未验证 |
| `docx-markdown-utils` | 中低 | （见包） | 双向 MD↔DOCX，14 个依赖 | 我们不生成 docx |
| `markitdown-ts` | ~1.1 万 | MIT | 仿 Microsoft markitdown：PDF / xlsx / URL / zip / 可选 LLM 描述图 | 依赖 `jsdom`、`pdf-parse`、`xlsx`、`ai`；URL 转换与离线默认冲突 |
| `@paulmeller/docflow` | 低 | 视包 | SuperDoc + jsdom，链式 API | 体积与职责远超「转一篇 Word」 |

这些包的 DOCX 路径，文档里都能追到 mammoth。买包装等于：多锁定一层、多拖无关格式，换不来更好的 Word 语义。兼容性不是「Windows 跑不了」，见下两小节。

#### word-to-markdown（benbalter，0.3.0）

纯 JS，**没有**按平台的原生包。Win ARM / Alpine / 本机三个桌面 OS 都能跑，和自拼 mammoth 同一档。

| 项 | 兼容结论 |
|----|----------|
| OS / CPU | 无原生。DSH 承诺的 Win/macOS/Linux（含 ARM）都过 |
| Node | 要求 **≥ 22.13**。DSH 是 `^22.19 \|\| >=24`，**运行时够**。本仓库 esbuild `target: node20` 只影响我们打出来的 `lib/`，不挡它 |
| 模块 | ESM only。Host 已是 ESM + `packages: 'external'`，import 即可 |
| 默认行为 | 图片 **base64 内嵌**。一篇带图合同很容易顶满 5 MB 配额；必须显式 `images: 'strip'` 或 `'extract'` |
| 中文样式 | 没有自带「标题 1」映射；要靠 `options.mammoth.styleMap`，和自拼一样 |
| 公式 / 文本框 / 批注 | 文档写明 **mammoth 阶段丢掉**；`convertWithWarnings` 才有提示 |
| 体积 | 运行时还拉 prettier、markdownlint。清洗更干净，转换更慢，lock 更肥 |
| 成熟度 | 2026-07 上架，周下载约 40。API 可能变；不要当十年基建 |

**结论**：平台兼容性好。卡的是产品默认（内嵌图）和包太新，不是 OS。

#### markitdown-ts（0.0.10）

DOCX 仍走 mammoth，**但 `npm i` 会把 PDF/表格栈整棵装进来**，兼容性出在依赖树，不在 Word 解析。

| 项 | 兼容结论 |
|----|----------|
| DOCX 本体 | 纯 JS，平台齐 |
| `pdf-parse` ^2.4 | **硬依赖 `@napi-rs/canvas`**（原生 Skia，约几十 MB）。只转 docx 也会装上 |
| canvas 平台 | 官方 optional 含 darwin-arm64/x64、linux gnu/musl x64+arm64、**win32-arm64**、riscv。比 Pandoc 官方 zip **更齐** |
| 原生真实风险 | ① Node ABI：DSH 用户会混 22.19 与 24，预编译对不上就装失败或运行崩；② `package-lock` 在 Mac 生成、Linux 安装时 optional 丢包（npm 老问题）；③ Git 装插件时 `prepare` 只打 JS，canvas 必须能在用户机器上 `npm install` 出来 |
| `xlsx` 0.18.5 | npm 上最后一版，带原型污染 / ReDoS CVE。第一版不用 xlsx 也会进 lock；以后开表格等于喂用户文件给有洞的解析器 |
| `jsdom` | 无原生，但内存大。不要拿它在 Client 跑 |
| `ai` | Vercel AI SDK 是**直接依赖**，不是可选。DOCX 用不到，安装仍带上 |
| peer | `unzipper`、`youtube-transcript` 不装则 zip / YouTube 路径炸；DOCX 通常还能走 |
| 离线 | `convert(url)` 会联网。Host 只允许走路径 / Buffer，禁止 URL / Bing SERP / YouTube |
| PPTX | 未实现 |

**结论**：三个桌面 OS 的 DOCX **能转**。真正不兼容的是「为了一篇 Word 引入原生 canvas + 有洞的 xlsx」。这比 Pandoc 的 Win ARM 缺口更日常——每个 `dsh plugin add` 的用户都要过一遍原生安装。

### 5.3 全家桶：officeparser

| 项 | 事实 |
|----|------|
| 包 | `officeparser` 7.8.0（2026-08-18） |
| 许可 | MIT |
| 周下载 | ~74 万 |
| 做法 | 自研 AST，再 `OfficeConverter.convert(file, 'md')`；styleMap 号称兼容 mammoth |
| 引擎 | Node ≥ 18；CJS + ESM 双入口。`sideEffects: false` 但 **一个入口仍会解析全部格式依赖** |
| 依赖 | `@xmldom/xmldom`、`fflate`、`file-type`、**`pdfjs-dist@6.1.200`**、**`tesseract.js`** |
| 适合 | 同一里程碑要吃 PDF / xlsx / pptx，并接受 OCR 可选 |

#### 兼容性（对照知源 Host）

| 项 | 兼容结论 |
|----|----------|
| DOCX / OOXML | **纯 JS**（`fflate` 解 zip + xmldom）。Win ARM、Alpine、无编译器的机器都能转 Word |
| 装包体积 | **不能**「只买 docx」。`pdfjs-dist` + `tesseract.js` 会进 `node_modules`，即使从不调 PDF/OCR。比 mammoth 重一个数量级 |
| 运行时（默认） | `ocr` 默认 false，且 v6.1 起 **懒加载** Tesseract。只转 docx、不设 `ocr: true`，**不应**去拉语言包 |
| OCR 一旦打开 | 默认语言 **`eng`**；训练数据默认 **jsDelivr**。断网会挂或空识别。中文要 `chi_sim` / `chi_tra`，并自备 `langPath`（见 tesseract.js 本地安装说明） |
| PDF.js worker | 浏览器默认 `cdn.jsdelivr.net/.../pdf.worker.min.mjs`。Host 必须走 Node 入口、worker 用 `node_modules` 里的文件。**禁止**把 officeparser 打进 Client；也禁止 esbuild 把 Host **打进 bundle**（当前 `packages: 'external'` 是对的，改掉就会丢 worker） |
| 出 PDF | 可选 peer **puppeteer**（真 Chrome）。我们只吃进、不生成，不要装 |
| 中文 Word | 靠 styleMap，与 mammoth 同类，不是自动认「标题 1」 |
| 安全 | 维护者写明：解析器攻击面大、单人维护、不保证恶意文件。个人本机可接受；不要当隔离沙箱 |

**对知源现在**：DOCX **没有** Pandoc 那种「某 CPU 没包」的洞。代价是安装即全家桶，以及以后开 PDF/OCR 时必须先钉死 **离线 worker + 中文 tessdata**，否则「拔网线能导入」会在换档时被打破。

07 换档写明 PDF 另开。officeparser 的 RAG chunk 与 03「第一版不切段建目录」也不该现在用。

**后做信号**：真要同一套解析器吃 PDF+Office，再评估 officeparser（Node 入口、`ocr: false`、自备 pdf worker）。不要为 DOCX 单独预装。

### 5.4 Pandoc：平台矩阵（2026-09，对照 3.10.2 官方资产）

Pandoc **可以**当 Host 转换器。限制不在「Windows / macOS / Linux 这三个名字」，而在 **官方只打了哪些 CPU**、**单文件 25～40 MB**、以及 **GPL**。DSH Web / CLI 本身是 npm + Node，三个桌面 OS 都能跑；知源已经用 `@vscode/ripgrep` 的 `optionalDependencies` 按平台塞二进制——Pandoc 能抄这个形，但覆盖面和体积都对不齐 ripgrep。

#### 官方原生包

| 目标 | 官方资产 | 约体积 | 备注 |
|------|----------|--------|------|
| macOS Apple Silicon | `arm64-macOS.zip` / `.pkg` | 40 MB | GHC 侧要求 macOS **11.3+**；本机用户基本都过线 |
| macOS Intel | `x86_64-macOS.zip` / `.pkg` | 25 MB | 太旧的 macOS 走 Homebrew 会现场编 GHC，装很久 |
| Linux x64 | `linux-amd64.tar.gz` / `.deb` | 33 MB | **静态链接**，不绑 glibc；Alpine / musl 一般能跑 |
| Linux arm64 | `linux-arm64.tar.gz` / `.deb` | 36 MB | 同上 |
| Windows x64 | `windows-x86_64.zip` / `.msi` | 40 MB | 官方主发包 |
| **Windows ARM64**（Surface / 骁龙本） | **无** | — | [jgm/pandoc#10095](https://github.com/jgm/pandoc/issues/10095) 仍开着；卡在 GHC 没有 Windows AArch64。本机可用 **x64 包 + Prism 模拟**，更慢，偶发依赖问题 |
| Linux 32 位 / ppc64 / riscv64 / s390x | **无** | — | ripgrep 我们打了这些 optional 包；Pandoc 没有 |
| FreeBSD / Android | **无**官方包 | — | 源码或第三方 ports，不当承诺 |

对照本仓库已装的 ripgrep：12 个 optional 包（含 `win32-arm64`、`linux-arm`、`ia32`），每个大约一两 MB。Pandoc 每个 triple 大一个数量级，且缺 Win ARM 与冷门 Linux。

`dsh plugin add` / `npm install` 若用 optional 包，**只会下载当前机器那一份**（约 35 MB），不会五份全拉。Git 仓库不要把二进制检进 `lib/`。`prepare` 只打 JS，二进制必须来自 npm optional 或用户 PATH。

#### 三种接法的平台含义

| 接法 | 平台覆盖 | 离线 | 体积 / 许可 | 对知源 |
|------|----------|------|-------------|--------|
| **PATH：本机已装 `pandoc`** | 用户装到哪算哪；Win ARM 若装了 x64 包也能 spawn | 已装则断网能转 | 我们的包仍 MIT，不发行 GPL 二进制 | 没装就失败。要配 mammoth **回退**，否则导入在干净机器上是空的 |
| **optionalDep 打官方 zip（仿 ripgrep）** | 稳：darwin-arm64 / darwin-x64 / linux-x64 / linux-arm64 / win32-x64。**洞：win32-arm64**（可试塞 x64 exe 靠模拟） | 装包时需能拉 npm；装完断网能转 | 安装 +35 MB；**再分发官方二进制 = 带上 GPL-2.0-or-later** | 和现有 `@vscode/ripgrep` 同形，但我们要自建 5 个平台包，维护成本高 |
| **`pandoc-wasm`（官方 wasm，npm 约 15 MB）** | **与 OS/CPU 无关**：Node 18+ 能跑 WASM 即可，含 Win ARM、Alpine | 包内自带 `pandoc.wasm`，不访问网络（WASM 沙箱本来就不能 HTTP） | npm 包装 GPL（内含 wasm）；比原生慢；RTS 堆约 64 MB，5 MB 合同够用 | **平台兼容性最好的 Pandoc 路径**。DOCX→MD、`--extract-media` 走虚拟文件系统。不要打进 Client |

wasm 限制（对导入无伤）：不能调 LaTeX 出 PDF、不能跑外部 filter、不能自己去拉 URL。这些我们本来就不做。

#### 运行时注意（三个 OS 都有）

- Host 用 `spawn`，与 `search.ts` 调 rg 一样；cwd / 参数必须是绝对路径，Windows 注意空格与 `\\`。  
- macOS Gatekeeper：从 zip 解开的未签名二进制可能第一次被拦；pkg 安装通常好于我们自己 optional 解压。  
- Windows SmartScreen / 公司策略可能拦未签名 `pandoc.exe`。  
- 沙箱：DSH 在 Windows 上的命令沙箱有已知问题。转换必须在 **Host 进程内 spawn**，不要走「让模型执行 shell」那条。  
- 旧 `.doc`：原生 Pandoc 仍要外部转换器（常是 LibreOffice），**不要承诺**。加密 docx 同样失败。

#### 对本档选型的修正

Pandoc **不是**「平台不够用」被否掉，而是：

1. 想 **零本机依赖、全平台（含 Win ARM）**：`pandoc-wasm`，或 mammoth。  
2. 想 **原生速度 + 少维护**：PATH 上的 pandoc，没有则 mammoth。  
3. 想 **装上就能用、仿 ripgrep 发二进制**：只覆盖 5 个官方 triple，Win ARM 写明「走 x64 模拟或 wasm」。不要假装和 ripgrep 一样齐。

第一档若坚持「插件自己保证能转、不要求用户先装软件」：**wasm 或 mammoth**。PATH-only 不能当唯一实现。

### 5.5 明确不选

| 选项 | 原因 |
|------|------|
| 只用 `mammoth.convertToMarkdown` | 官方弃用，表格 / 清洗弱于 HTML→turndown |
| LibreOffice headless | 体积与启动成本更大，且同样要本机装套件 |
| 浏览器里转 | 违反 Host 主人；大文件会卡设置页 |
| 自研解 zip + 读 `word/document.xml` | 样式、编号、修订、表格合并成本远高于 mammoth |
| `.doc` / 加密 docx | 现有库基本不管；失败并提示另存为未加密 `.docx` |

---

## 6. 选定

仍先定 ingest 契约（§3 / §7）：Host 转成 `.md` 再落盘。引擎可换。

| 档 | 引擎 | 何时用 |
|----|------|--------|
| 默认实现（无本机软件） | `mammoth` + `turndown` + `@joplin/turndown-plugin-gfm` | 干净机器、Win ARM、不想 GPL、包要小 |
| 质量优先、平台要齐 | `pandoc-wasm`（Host only） | 接受 ~15 MB 与 GPL、要 Pandoc 保真 |
| 本机已有 Pandoc | PATH 里的 `pandoc` | 原生最快；**必须**无二进制时回退到上一档 |

不在第一档做：自建 5 个 optional 平台包去发官方 zip。缺 Win ARM、体积 35 MB、还要处理 GPL 再分发。

包装库（word-to-markdown 等）当对照实现：图片三态和中文 styleMap 可抄，不必装包。

---

## 7. 模块怎么切

目标文件都保持 ≤300 行。入口只装配。

| 文件 | 职责 |
|------|------|
| `src/convert/docx.ts` | 读路径或 Buffer → markdown 字符串 + `warnings[]`；styleMap；默认丢图 |
| `src/convert/md-from-html.ts` | turndown + GFM tables / strikethrough；与 docx 解耦，方便以后 HTML 源 |
| `src/identity.ts` | `CONVERT_EXTS = { '.docx' }`；`TEXT_EXTS` 仍只表示**库内可检索后缀** |
| `src/ingest.ts` | `ingestOne`：docx 走转换再写入 `.md`；md/txt 仍 `copyFile` |
| `src/pick-source.ts` | 文件对话框 filter 加上 `*.docx` |
| `src/client/settings/PrefsPage.tsx` | DOCX 解析器勾上（仍 disabled 或只读 checked，与 md 一样表示「已开」） |

不要：`src/parsers/*` 预留 PDF 空壳；不要 `chunks` 表；不要 Client 调 mammoth。

建议内部口（实现时再落类型，本档只定形状）：

```ts
type ConvertOutcome = {
  markdown: string
  warnings: string[]
  // 第一版恒为空；extract 档再填
  images: { name: string; bytes: Uint8Array }[]
}

convertDocx(sourcePath: string): Promise<ConvertOutcome>
```

`ingestOne` 对 docx：

1. 源体积 > `maxFileBytes` → 该项失败（与现 md 相同）。  
2. `convertDocx` 抛错 → `failed`，reason 用库错误原文（截断到一行）。  
3. `Buffer.byteLength(markdown)` 再过一遍 5 MB / 10 GB。  
4. 目标名：`basename` 去 `.docx` 加 `.md`；冲突仍 `name-2.md`。  
5. `sha256` 对 markdown utf8，不对本机源 zip。  
6. `writeFile` 目标 md，不 `copyFile` 源。

---

## 8. 保真与失败边界

Word 和 Markdown 结构不对齐。mammoth 只认**语义样式**，不抄页面布局。下面必须在 UI / Skill / 关于页说清，避免「导入成功 = 版式还原」。

| 能保 | 弱或丢 | 直接失败 |
|------|--------|----------|
| 标题（含映射后的「标题 N」） | 文本框 / 艺术字 / SmartArt | 不是合法 zip / 不是 docx |
| 段落、粗斜体、删除线 | 修订（可能只留最终或混进痕迹，需样张确认） | 加密 / 权限保护 |
| 有序 / 无序清单 | 复杂编号、多级混用 | `.doc` |
| GFM 管道表（简单行列） | 合并单元格、嵌套表、表边框 | 转换超时（队列里单项，不拖垮进程需自设上限） |
| 超链接 | 页眉页脚、批注（可配置忽略） | — |
| 脚注 / 尾注（mammoth 支持） | 公式（OMML；第一版当普通跑或变乱码） | — |

公式：Pandoc 对 OMML / 公式通常强于 mammoth。若选 §5.4 的 PATH 或 wasm 路径，公式跟 Pandoc 走；纯 mammoth 档再另评估 `@aidalinfo/office-to-markdown`。

---

## 9. 安全

DOCX 是 zip。mammoth / officeparser 都会解压内部 XML。

- 只读用户给的 `sourcePath`，写出仍只在 `bases/<id>/`（现有 `assertInside`）。  
- 不解出嵌入 OLE 可执行物到库外。  
- 第一版不抽图，减少 zip bomb 落盘面；仍应对转换设时间上限（例如 30s），超时记失败。  
- 不把源路径或转换 HTML 发给网络。

officeparser 自己写明：解析器攻击面大，不保证恶意文件安全。我们选更窄的 mammoth，不等于可以喂完全不信任的来源；个人本机库场景可接受。

---

## 10. 验收（实现档才勾）

实现未写、样张未跑，下列全是待做。

- [ ] 单测：最小 fixture（标题、列表、表、中文「标题 1」、超链接）→ 稳定 md 快照  
- [ ] 单测：非法字节 / `.doc` 扩展名 → `failed`，库目录无新文件  
- [ ] 单测：同文档转两次 → 第二次 skip（md 指纹）  
- [ ] 文件夹混进 md + docx：两种都进，后缀对  
- [ ] 偏好勾 DOCX；选文件对话框能点到 `.docx`  
- [ ] 断网：本机 docx 仍能导入（不声明「网页已开」除非真跑过 `dsh web`）  
- [ ] 一篇真实中文合同（用户自备，不进 git）：条款能被 `kb_search` 命中  

---

## 11. 明确本档不写进代码的

- PDF、xlsx、pptx、OCR  
- 库内保留源 `.docx`  
- 对话区芯片、自动归类、FTS  
- 为「以后方便」接入 officeparser / markitdown-ts  
- 把转换放到 Client 或自建 HTTP

---

## 12. 参考链接

- mammoth：https://github.com/mwilliamson/mammoth.js · https://www.npmjs.com/package/mammoth  
- turndown：https://github.com/mixmark-io/turndown  
- Joplin GFM 插件：https://www.npmjs.com/package/@joplin/turndown-plugin-gfm  
- word-to-markdown（对照管道）：https://github.com/benbalter/word-to-markdown-js  
- markitdown-ts：https://www.npmjs.com/package/markitdown-ts  
- officeparser：https://github.com/harshankur/officeParser  
- `@napi-rs/canvas` 平台包（markitdown-ts → pdf-parse）：https://www.npmjs.com/package/@napi-rs/canvas  
- tesseract.js 本地语言包：https://github.com/naptha/tesseract.js/blob/HEAD/docs/local-installation.md  
- Pandoc 安装说明：https://github.com/jgm/pandoc/blob/main/INSTALL.md  
- 官方发布（平台资产）：https://github.com/jgm/pandoc/releases  
- Windows ARM64 无官方包：https://github.com/jgm/pandoc/issues/10095  
- `pandoc-wasm`：https://github.com/pandoc/pandoc-wasm · https://www.npmjs.com/package/pandoc-wasm  
- 本仓库先行结论：01 §4.5「`.docx` 当压缩包解开再抽」——JS 路径落成 mammoth；Pandoc 见 §5.4。
