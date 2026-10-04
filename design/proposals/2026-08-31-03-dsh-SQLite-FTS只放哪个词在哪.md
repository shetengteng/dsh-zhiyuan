# SQLite FTS：原文仍在文件里，库里只放「哪个词在哪」

> 对外用语与 02 一致：知识库 / 类目。本文「格子」只指 SQLite 表的存储格，不是产品里的类目。

核心就一句：**文件夹里的 md 还是唯一正文；SQLite 只是一本「书末索引」，不存整本书。**

---

## FTS 是啥

**FTS = Full-Text Search，全文检索。**

不是另一套数据库，是 SQLite 自带的一种表（常见是 FTS5）。普通表适合「按编号精确查一行」；FTS 表专门干一件事：提前建好「哪个词出现在哪一行」，查的时候按词去翻这本目录，而不是把每篇文章从头扫到尾。

和日常工具的对照：


|                   | 干什么                 | 像什么      |
| ----------------- | ------------------- | -------- |
| **grep / Ctrl+F** | 当场在正文里找这几个字         | 把书一页页翻过去 |
| **SQLite 普通表**    | `id = 12` 这种精确条件    | 按编号抽一张卡片 |
| **SQLite FTS**    | 「违约」出现在哪些篇、哪些段，还能打分 | 翻书末索引    |


所以文档里写「SQLite FTS（后做）」，意思是：以后用 SQLite 里这种**按字建目录**的表，当检索目录；不是换一个叫 FTS 的新软件。

它多出来、grep 没有的，主要是两样：

1. **不用每次扫全文**——词已经记在目录里。
2. **能排序**——同一个词出现得多、又比较稀有的段落，可以排在前面（常见算法叫 BM25）。对人来说就是「哪一段更相关」。

它仍然是**按字**找。用户换了一种说法、原文里没有这些字，FTS 也找不到——所以前面还是要「换一次词」。懂意思是另一条路（向量），和 FTS 不是一回事。

---



## 虚表是啥

**虚表 = Virtual Table。** 外表还是一张表，可以 `SELECT` / `INSERT` / `JOIN`；里面不是你一格一格存的普通行，而是一个**模块**在替你干活。

普通表：你建了哪些列，磁盘上就有哪些格子，SQLite 原样存、原样取。

虚表：你对它写 SQL，SQLite 把请求转给某个模块。FTS5 就是这样一种模块——你以为在查一张表，它其实在翻自己维护的那本「哪个词在哪」。


|                              | 怎么建                                      | 数据实际在哪                      |
| ---------------------------- | ---------------------------------------- | --------------------------- |
| **普通表** `documents`、`chunks` | `CREATE TABLE`                           | 就是这张表里的行                    |
| **虚表** `chunks_fts`          | `CREATE VIRTUAL TABLE … USING fts5(...)` | 模块在背后另建几张影子表当目录；你不要自己改那些影子表 |


所以前面说「自己建 4 张表，倒排不要手写」：`meta` / `bases` / `documents` / `chunks` 是普通表；`chunks_fts` 是虚表。你只对虚表 `INSERT` 按字切开的串、`MATCH` 查询；「违约 → 第 12 段」那本目录在模块内部。不是先跑一遍中文分词器。

用前面的例子：

```sql
-- 普通表：你写什么，库里就是什么
INSERT INTO chunks (id, document_id, start_line, end_line)
VALUES (12, 1, 3, 4);

-- 虚表：你喂字，FTS 模块去建目录；content='' 时这些字查的时候拿不回来
INSERT INTO chunks_fts (rowid, tokens)
VALUES (12, '甲方 方与 … 违约 约金 termination …');
```

查的时候还是当表用，只是条件换成 FTS 的 `MATCH`：

```sql
SELECT rowid, rank FROM chunks_fts WHERE chunks_fts MATCH '违约';
```

SQLite 不会去扫 `tokens` 这一列的原文（而且 contentless 也没有原文可扫），而是让 FTS 模块查目录，返回 rowid=12，再 JOIN 普通表 `chunks` 得到「供应商.md 第 3–4 行」。

虚表不是「假表」或「内存里玩玩」：它写在同一个 `.sqlite` 文件里，关掉进程还在。只是**存取方式换了人**，不是换了一种看不见的临时结构。

FTS 模块还会自动建 `chunks_fts_data`、`chunks_fts_idx` 这类影子表。那才是真正的词表；当普通表去 `INSERT`/`UPDATE` 它们会把目录弄坏。日常只碰 `chunks_fts` 这个虚表名字。

---



## 两件事先分开


|                | 存什么            | 像什么     |
| -------------- | -------------- | ------- |
| **文件夹**        | 完整原文           | 书架上的书   |
| **SQLite FTS** | 「这个词出现在哪篇、哪一段」 | 书末那几页索引 |


MVP 没有这本索引：每次问都拿 ripgrep 把该知识库里的字扫一遍。篇数多了再建索引，**原文不搬家**。

---



## 用两篇文件走一遍

假设该知识库里只有这两篇：

`bases/work/contracts/供应商.md`

```markdown
# 供应商合同

甲方与乙方签署本协议。若乙方违约，甲方可解除合同并收取违约金。
termination 条款见附件三。
```

`bases/work/meetings/2024-03.md`

```markdown
# 三月例会

讨论了供应商交付延期。法务说违约金按合同执行。
```

---



### MVP：没有 SQLite，当场 grep

问「违约条款」，插件做：

```bash
rg -n -C 8 -e 违约 -e 解约 -e termination -e 违约金 bases/work/contracts
```

等于打开该库的文件、逐页找这几个字。找到了，再把命中行附近拷出来给 AI。  
**库里没有任何「哪个词在哪」的表。**

---



### 后做：导入时建一本索引

导入（或后台扫一遍）时，程序读文件、切词，往 SQLite 里写的是这种东西——**不是全文**：


| 词           | 在哪                                                     |
| ----------- | ------------------------------------------------------ |
| 违约          | `contracts/供应商.md` 第 3 行                               |
| 违约金         | `contracts/供应商.md` 第 3 行；`meetings/2024-03.md` 第 3 行   |
| termination | `contracts/供应商.md` 第 4 行                               |
| 解除          | `contracts/供应商.md` 第 3 行                               |
| 合同          | `contracts/供应商.md` 第 1、3 行；`meetings/2024-03.md` 第 3 行 |
| 延期          | `meetings/2024-03.md` 第 3 行                            |


可以把它想成书末索引：

> **违约** —— 供应商合同，第 3 行  
> **违约金** —— 供应商合同第 3 行；三月例会第 3 行  
> **termination** —— 供应商合同，第 4 行  

索引里**没有**「甲方与乙方签署本协议……」整段字。那段字仍只在 md 文件里。

真正的 SQLite FTS 表会再记：这个词在这篇里出现几次、这段大概多长（用来打分）。对人来说还是同一句话：**哪个词在哪。**

---



### 有索引之后，查询怎么走

还是同一句：「去年那个供应商合同的违约条款写了什么？」

1. **选定知识库**：`bases/work/contracts/`（会议类目不查）。
2. **换词一次**：`违约`、`解约`、`termination`、`违约金`。
3. **查索引，不再扫全文**：
  - `违约` → 供应商.md 第 3 行  
  - `termination` → 供应商.md 第 4 行  
  - `违约金` → 供应商.md 第 3 行  
  - `解约` → 没有（这篇没写这个字）
4. **回文件取正文**：打开 `供应商.md`，把第 3～4 行附近那段读出来交给 AI。
5. **可以打分**：`违约` + `违约金` + `termination` 都落在同一篇，这篇会排在只出现一次「合同」的会议纪要前面。grep 做不到这种「哪段更相关」。

会议纪要里也有「违约金」，但第 1 步没有选择那个知识库，索引里那一行根本不会被翻到。

---



## 「库里只放哪个词在哪」具体不放什么

**SQLite 里有的（目录）：**

- 文件路径、类目、导入时间  
- 词 → 文件 + 行号/段落号  
- 可选：这个词出现几次（给 BM25 打分用）

**SQLite 里没有的（仍在文件里）：**

- 整篇 markdown  
- AI 最终读到的那十几段原文（现查现读文件）

所以文件改了、删了，要以文件夹为准：索引过期就重建那一篇，**不要把 SQLite 当成第二份正文。**

---



## 和「把全文塞进 SQLite」差在哪

有人会建一张表：`content TEXT`，把整篇 md 拷进去，再用 FTS 搜这张表。那样：

- 磁盘上有两份正文（文件一份、库一份）
- 改文件要同步两处，容易漂
- 卸载/备份也说不清「知识到底在哪」

你们定的是：**文件 = 货，SQLite = 目录卡片。** 卡片丢了可以按文件夹重建；货丢了目录再全也没用。

---



## 录入要不要分词

**不需要 jieba、HanLP 那种「中文分词」。** 录入 SQLite 不是做 NLP，也不靠引擎读懂「违约金」是一个词。

和 grep 的差别只有一句：grep 在原文里找连续字，完全不切；FTS 必须把字变成一条条目录项，**某种切开一定发生**，但那是切字，不是分词。


| 做法                               | 要不要      | 说明                                    |
| -------------------------------- | -------- | ------------------------------------- |
| 语义分词（jieba：`违约金` / `解除` / `合同`）  | **不要**   | 词表、歧义、维护成本都与这档方案无关                    |
| 什么都不切，整段中文塞进默认 `unicode61`       | **不行**   | 没有空格时，一整句常被当成一个 token；搜「违约」对不上「若乙方违约」 |
| 两个字一组（`违约` `约金`）或 FTS5 `trigram` | **要选一种** | 只按字切开，好让「违约」能命中                       |


推荐继续用文档里的 **两个字一组**：查询经常是两个汉字，`trigram` 的 `MATCH` 往往要求至少三个字，短词不稳。英文、编号原样留下即可。

所以插入虚表时，不是「先分词再入库」，而是：从文件读出那段 → 按字叠成 bigram（英文不切）→ 空格拼成一串喂给 FTS → 目录建完字丢掉。正文仍在 md 里，一次都没被改成词列表。

---



## 中文「两个字一组」是什么意思（后做才需要）

英文按空格切：`termination` 自己就是一个词。  
中文没有空格，「违约」要能被搜到，做法是：**在连续汉字上滑一个宽度为 2 的窗口**，每滑一格记一对象。没有词典，也不判断这是不是一个词。

### 「违约 约金」是怎么来的

原文里有三个字：`违` `约` `金`（「违约金」）。

从左往右，每次取相邻两个字，窗口右移一格：

```text
字序:     1      2      3
         违     约     金
窗口1:   [违     约]          →  违约
窗口2:          [约     金]   →  约金
```

得到 `违约` `约金`。  
第三个字「金」不能单独成组（只剩一个字），丢掉或忽略。

再长一点：`若乙方违约`（5 个汉字）同样滑：

```text
若 乙 方 违 约
若乙
  乙方
    方违
      违约
```

得到 `若乙` `乙方` `方违` `违约`。搜「违约」时，目录里有这一条就能命中。搜「违约金」时，查询端用**同一套滑窗**切成 `违约` `约金`，两段都命中才算这段更相关。

标点、空格、英文会把汉字串断开，各自滑，不跨过去：

```text
收取违约金。termination 条款
│          │            │
连续汉字     英文单词       连续汉字

收取 取违 违约 约金    termination    条款
```

伪代码就是两行：

```text
对每一段连续汉字 s：
  从 i = 0 到 len(s)-2：
    放出 s[i] + s[i+1]
英文 / 数字整段原样放出
```

这是建目录时的切法，**不是把正文改成两字一组存进库。** 正文仍是那句完整的中文。

---



## 什么时候才需要这本目录


|                | grep（现在）      | SQLite FTS（后做）           |
| -------------- | ------------- | ------------------------ |
| 几百篇 md         | 一次扫完，够快       | 没必要                      |
| 上千篇 / 要「哪段更相关」 | 每次整库扫，又慢又不能打分 | 查索引 + 回文件取段              |
| 原文在哪           | 文件夹           | 还是文件夹                    |
| 人怎么问           | 先选择知识库、换 3～8 个词  | 漏斗不变，只是第 3 步从 grep 换成查目录 |


对使用者：还是 `kb_search`，还是先选择知识库、换一次词。变的只是插件内部「当场扫字」还是「先查目录再打开文件」。

---



## 若要实现：要建哪些表、字段是什么

一份库文件即可，例如 `~/dsh/data/dsh-knowledge/catalog.sqlite`。  
**自己建 4 张表**；「词 → 哪一段」那本倒排目录不要手写，FTS5 虚表内部会生成。


| 表            | 人话                  | 存不存原文             |
| ------------ | ------------------- | ----------------- |
| `meta`       | 目录版本号               | 否                 |
| `bases`      | 有哪些知识库               | 否                 |
| `documents`  | 哪份文件、指纹、是否能搜        | 否（最多一个标题）         |
| `chunks`     | 第几段在文件的第几行到第几行      | 否                 |
| `chunks_fts` | FTS5 虚表：喂切好的词，只为建目录 | 不存正文；`content=''` |


对应关系：

```text
词  ──(FTS 内部)──►  chunk_id  ──(chunks)──►  第几行
                                      └──(documents)──►  哪个文件
然后打开文件夹里的 md，把那几行读出来给 AI
```



### 表结构

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE bases (
  id           TEXT PRIMARY KEY,     -- work
  name         TEXT NOT NULL,        -- 工作库
  rel_dir      TEXT NOT NULL UNIQUE, -- bases/work
  last_used_at INTEGER,              -- unix ms；没说搜哪个知识库时用
  created_at   INTEGER NOT NULL
);

CREATE TABLE documents (
  id           INTEGER PRIMARY KEY,
  base_id      TEXT NOT NULL REFERENCES bases(id),
  category     TEXT NOT NULL DEFAULT '', -- contracts；库根下的文件为空
  rel_path     TEXT NOT NULL,            -- 相对这个库：contracts/供应商.md
  title        TEXT,                     -- 首个标题，给人看，不是正文
  fingerprint  TEXT NOT NULL,            -- sha256；相同则跳过
  size_bytes   INTEGER NOT NULL,
  mtime_ms     INTEGER NOT NULL,
  status       TEXT NOT NULL,            -- ready | failed | missing
  error        TEXT,                     -- failed 时的原因
  indexed_at   INTEGER,                  -- 上次建成目录的时间
  UNIQUE (base_id, rel_path)
);

CREATE INDEX idx_documents_base_cat ON documents(base_id, category);
CREATE INDEX idx_documents_fp ON documents(fingerprint);

CREATE TABLE chunks (
  id           INTEGER PRIMARY KEY,
  document_id  INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index  INTEGER NOT NULL,  -- 篇内第几段，从 0
  start_line   INTEGER NOT NULL,  -- 1-based，回文件截段用
  end_line     INTEGER NOT NULL,
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX idx_chunks_document ON chunks(document_id);

-- 虚表：INSERT 时喂按字切开的串（两个字一组 + 英文原样），不是 jieba 分词
-- SQLite 建目录后丢掉这些字；contentless_delete=1 需要 SQLite 3.43+
CREATE VIRTUAL TABLE chunks_fts USING fts5(
  tokens,
  content = '',
  contentless_delete = 1,
  tokenize = 'unicode61 remove_diacritics 2'
);
```

`chunks_fts` 插入时 **rowid 必须等于** `chunks.id`，查询才能 JOIN。

中文不要指望 unicode61 按词切开（一整句可能变成一个 token），也 **不必上 jieba**。按前文「两个字一组」，插入前把汉字叠成 bigram，英文词原样留下，用空格拼进 `tokens`。这一列是给引擎建目录用的，不是给人读的正文。

### 用前面两篇文件看一行长什么样

`供应商.md` 按空行切成两段：标题一行；正文两行。

`documents`


| id  | base_id | category  | rel_path            | title | fingerprint | status |
| --- | ------- | --------- | ------------------- | ----- | ----------- | ------ |
| 1   | work    | contracts | contracts/供应商.md    | 供应商合同 | a1b2…       | ready  |
| 2   | work    | meetings  | meetings/2024-03.md | 三月例会  | c3d4…       | ready  |


`chunks`（只记行号）


| id  | document_id | chunk_index | start_line | end_line |
| --- | ----------- | ----------- | ---------- | -------- |
| 11  | 1           | 0           | 1          | 1        |
| 12  | 1           | 1           | 3          | 4        |
| 21  | 2           | 0           | 1          | 1        |
| 22  | 2           | 1           | 3          | 3        |


`chunks_fts`（喂切字结果，查的时候拿不到这段中文）


| rowid | tokens（示意）                             |
| ----- | -------------------------------------- |
| 12    | `甲方 方与 与乙 乙方 … 违约 约金 termination 条款 …` |
| 22    | `讨论 论了 … 违约 约金 合同 同执 …`                |


「违约」在 FTS 内部指向 rowid 12 和 22；再看 `chunks` 才知道是 `供应商.md` 第 3–4 行、`2024-03.md` 第 3 行。

### 查询时怎么用（仍先选择知识库）

```sql
SELECT
  d.rel_path,
  c.start_line,
  c.end_line,
  chunks_fts.rank
FROM chunks_fts
JOIN chunks    c ON c.id = chunks_fts.rowid
JOIN documents d ON d.id = c.document_id
WHERE d.base_id = 'work'
  AND d.category = 'contracts'   -- 对不上类目就去掉这行
  AND d.status = 'ready'
  AND chunks_fts MATCH '违约 OR 解约 OR termination OR 违约金'
ORDER BY rank
LIMIT 20;
```

命中之后 **打开文件夹里的文件**，读 `start_line`～`end_line`（可再扩几行当上下文），把片段交给 AI。库里没有这段字。

文件改了：指纹变 → 删该 `documents` 的旧 `chunks`（CASCADE）并删对应 FTS 行 → 重切、重喂。文件没了：`status = missing`，搜索不加。

### 不要建的表


| 不要                                  | 为什么                                          |
| ----------------------------------- | -------------------------------------------- |
| `documents.content` / `chunks.body` | 第二份正文，和「只放哪个词在哪」相反                           |
| 自己建 `postings(term, chunk_id)`      | 倒排是 FTS5 的工作；它会另建 `chunks_fts_data` 等影子表，不要改 |
| 向量表                                 | 本档只做按字目录；语义以后另开                              |


术语别名表（重试 → retry）可以后做，不是 FTS 能搜起来的前提。