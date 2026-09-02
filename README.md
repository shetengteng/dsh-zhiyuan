# 知源

知源（DSH 知识库）：让 AI 从你指定的资料中查找答案，并保留原文出处。

Zhiyuan is a local-first knowledge base plugin for DSH. It helps users organize Markdown and plain-text documents into explicit knowledge bases and provides source-grounded search results for AI conversations.

| 场景 | 名称 |
|------|------|
| 品牌 | 知源 |
| 设置入口 | 知源 |
| 包名 | `dsh-zhiyuan` |

同一 npm 包、一次安装：Host（建库 / 导入 / 检索）+ Web 工作台。目标运行时 **DSH `0.1.1-rc.2`**。

[English](./README.en.md)

## 它做什么

人显式新建知识库，把本机 `.md` / `.txt` / `.markdown` 拷进指定库和类目；查询时先选库，再用 3～8 个关键词一次 grep。命中带文件路径、行号和片段编号，交给当前对话模型写答案。

- **正文只在文件夹里。** 导入是拷贝，不是记外链，也不把全文写入数据库。
- **类目就是子文件夹。** 例如 `bases/<uuid>/合同/2024/供应商合同.md`。
- **先选库再搜。** 未点名库时，模型必须先列库再选一个 `baseId`，禁止扫全部库。
- **离线。** 导入和检索不访问外网。完整自然语言答案取决于本机是否有可用模型。

工作台挂在设置左侧 `settings.section`（`id: knowledge`，标签「知源」）。插件配置窄卡不再做一份工作台。

## 明确不做（本 MVP）

| 不做 | 说明 |
|------|------|
| SQLite FTS / 切段建目录 | 个人量级当场 grep；约 2000 篇或需要排序时再开 |
| 导入时自动选库 / 建库 / 归类 | 放错库 = 漏斗永远扫不到 |
| PDF / DOCX / 监视源目录 | 第一版只承诺 md/txt |
| 网上嵌入 / 假向量 / `kb_ask` | 破坏离线，也不在本阶段 |
| 主左侧一级「知识库」、对话顶栏芯片 | 没有官方座位或会再长一套管理 UI |
| 把当前项目 grep 冒充知识库 | 项目检索 ≠ 已导入资料 |

换引擎（以后 FTS）不改工具名、不改「先选库再搜」、不改「命中必须带出处」。

## 兼容性

| 项 | 值 |
|----|-----|
| 交付形态 | Host + Web UI 双面插件 |
| 目标 DSH | `0.1.1-rc.2` |
| 客户端 | `dsh.client.platform: "web"`，随 Web profile 自动加载 |
| 许可证 | MIT |
| 运行身份 | Cordis 行 `id: zhiyuan`，`name` 必须等于包名 `dsh-zhiyuan` |

headless profile 没有 UI，不代表 Client 已加载。

## 安装与激活

在本仓库根目录、选用带 Web 的开发 profile：

```sh
dsh plugin --profile web add .
dsh --profile web --dump-config
dsh web
```

`dump-config` 必须出现本包层（`dsh-zhiyuan` / 行 id `zhiyuan`）。本地 `add .` 是开发链接，profile 使用期间请保持仓库目录在位。

发布验证应针对确切公开 commit，而不是未提交的工作树。

## 配置

持久状态的主人在 Host。数据根走 DSH 官方插件数据目录，逻辑布局：

```text
<plugin-data>/dsh-zhiyuan/
├── catalog.json          # 库卡片 + 上次用哪个；不是正文
└── bases/
    ├── <uuid>/合同/2024/供应商合同.md
    └── <uuid>/
```

`catalog.json` 没有也能扫 `bases/` 列出库；没有卡片时描述为空，模型容易选错库，所以创建入口必须写描述。

工作台「偏好」可改：默认库、单文件上限（默认 5 MB）、单库文字上限（默认 10 GB）。解析器：md/txt 可用，其余置灰。

库卡片字段：`id` / `title` / `description` / `aliases`。`id` 由系统自动生成 UUID，创建后不可改，也不在创建/编辑表单中展示；`title` 必须唯一。

## 怎么用

1. **建库**：设置 → 知源 → 新建。必填标题、描述；标题不能重复，id 由系统自动生成；别名可选（如「工作」「公司」）。导入路径不会自动建库。
2. **导入**：指定已有 `baseId` 和类目 `destCategory`（空 = 库根）。缺类目则创建文件夹；缺库则失败。源文件只读，不改动。
3. **问**：自然语言问库里的事实。模型应先 `kb_list_bases`，再一次 `kb_search`。没命中不得说「根据知识库」。
4. **试搜**：工作台输入框直接检索，不经过模型，用来确认拔网线还能搜。

斜杠命令（与工具同一套字段）：

```text
/kb ingest <path> --base <id> --to <destCategory>
/kb status
```

`--to` 缺时：该库有上次类目则复用；否则报错提示补上 `--to` 或 `--root`。不单独做 `/kb search` 当主路径。

## 给 AI 的工具

| 工具 | 作用 |
|------|------|
| `kb_list_bases` | 列库：id / 标题 / 描述 / 别名 / 类目名 / 约多少篇。不含文件名、不含正文 |
| `kb_ingest` | 拷进已有库。`baseId`、`sourcePath` 必填；`destCategory` 语义必填 |
| `kb_search` | 只扫指定库。不带 `baseId` 则校验失败。`aliases` 建议 3～8 个，一次 OR |

Skill 硬规则：没点名库先列库，两个都像就问人；换词只做一次；当前项目里的 `grep` / `glob` 不算知识库检索；禁止猜一个新库再导入。

对话里的命中卡展示路径、片段和数字编号标签；回答中的引用编号使用 Markdown 行内代码（例如 `1`），点开卡片后在 DSH 右侧分区展示只读 Markdown 预览，不能改，不跳设置页。

## 验证

实现、安装、激活、运行时验证分开声明。没跑过的检查不要声称通过。

安装后至少确认：

- `dsh --profile web --dump-config` 出现本包层
- Host 加载成功；Web profile 下设置左侧有「知源」
- 卸载 / 重载不崩，订阅与座位能卸掉

走一遍（产品验收）：

1. 新建库「工作库」，别名：工作、公司。系统生成 UUID；描述写清「问条款、纪要开这个库；个人账单不要放」。
2. 导入本机一份合同 md，类目 `合同/2024`（原先可以不存在）。
3. 磁盘为 `bases/<uuid>/合同/2024/…`；源文件未被改。
4. 问违约条款：模型先列库，再用返回的 `baseId` 调 `kb_search`；命中带行号。
5. 拔网线：再导入、再试搜，仍成功。

必须失败：ingest 到不存在的库；`destCategory` 含 `..` 或绝对路径；`kb_search` 不带 `baseId`；单文件超过 5 MB（该文件失败，其他可继续）；空库搜索返回空列表。

## 停用与卸载

从所用 profile 的依赖 / bundle 层中去掉本包后重启 Host。去掉后 Cordis 行 `zhiyuan` 不应再出现；Web 不再挂「知源」section。

卸载默认**不删除**插件数据目录里的 `bases/` 与 `catalog.json`。若要清掉本地副本，再手动删除该数据目录。删库 / 删文件删的是知识库副本，不是当初指定的源路径。

## 开发

```sh
npm test
npm run build
```

Git 安装会跑 `prepare`（构建 `lib/`）。`main` / `exports` / `files` / `dsh.bundle.patch` 指向的路径，干净构建后必须存在。不要把 `src/` 当运行入口。

改插件代码前阅读 [DeepSeek Harness plugin 契约](https://dsh.pub/develop-plugin.md)。本仓库规则优先。

产品边界与里程碑见 `design/`（尤其 [实施计划](./design/2026-08-31-06-dsh-知识库MVP实施计划.md) 与 [待办](./design/2026-08-31-07-dsh-知识库MVP待办.md)）。
