# Zhiyuan

Zhiyuan (DSH Knowledge Base): let the AI find answers in the documents you designate, and keep citations back to the original files.

知源是 DSH 的本地优先知识库插件，帮助用户将 Markdown 和纯文本资料导入指定知识库，并通过可追溯的原文检索为 AI 提供可靠上下文。

| Context | Name |
|---------|------|
| Brand | Zhiyuan (知源) |
| Settings entry | Zhiyuan (知源) |
| Package | `dsh-zhiyuan` |

One npm package, one install: Host (create / ingest / search) + Web workbench. Target runtime **DSH `0.1.1-rc.2`**.

[中文](./README.md)

## What it does

You create a knowledge base explicitly, then copy local `.md` / `.txt` / `.markdown` files into a chosen base and category. Search always selects a base first, then greps once with 3–8 keywords. Hits include file path, line numbers, and a numeric excerpt id, which the current chat model uses to write the answer.

- **Source text lives in folders only.** Ingest copies files. It does not store external links, and it does not write full text into a database.
- **A category is a subdirectory.** Example: `bases/<uuid>/合同/2024/供应商合同.md`.
- **Select a base, then search.** If the user does not name a base, the model must list bases and pick one `baseId`. Scanning every base is forbidden.
- **Offline.** Ingest and search do not use the network. A complete natural-language answer still depends on having a local model.

The workbench mounts on the left of Settings as `settings.section` (`id: knowledge`, label「知源」). The narrow plugin config card is not a second workbench.

## Out of scope (this MVP)

| Not in this MVP | Why |
|-----------------|-----|
| SQLite FTS / chunked index | Personal scale greps in place; reopen around ~2000 docs or when ranking is required |
| Auto-pick / auto-create / auto-classify on ingest | A wrong base means the funnel never finds the file |
| PDF / DOCX / watched source folders | First version commits to md/txt only |
| Remote embeddings / fake vectors / `kb_ask` | Breaks offline; not this phase |
| Top-level sidebar「知识库」, conversation chips | No official seat, or it would grow a second admin UI |
| Treating project `grep` as knowledge-base search | Repo search ≠ ingested documents |

A later engine swap (FTS) must not change tool names, the “select a base first” funnel, or the rule that hits must carry citations.

## Compatibility

| Item | Value |
|------|-------|
| Delivery | Dual-face Host + Web UI plugin |
| Target DSH | `0.1.1-rc.2` |
| Client | `dsh.client.platform: "web"`, loaded automatically by a Web profile |
| License | MIT |
| Runtime identity | Cordis row `id: zhiyuan`; `name` must equal the package name `dsh-zhiyuan` |

A headless profile having no UI does not prove the Client loaded.

## Install and activate

From the repository root, using a Web-capable development profile:

```sh
dsh plugin --profile web add .
dsh --profile web --dump-config
dsh web
```

`--dump-config` must show this package layer (`dsh-zhiyuan` / row id `zhiyuan`). Local `add .` is a development link; keep the repository directory in place while the profile uses it.

Release verification should target an exact public commit, not an uncommitted working tree.

## Configure

The Host owns durable state. The data root uses the official DSH plugin data directory:

```text
<plugin-data>/dsh-zhiyuan/
├── catalog.json          # base cards + last-used; not source text
└── bases/
    ├── <uuid>/合同/2024/供应商合同.md
    └── <uuid>/
```

Bases can still be listed by scanning `bases/` when `catalog.json` is missing. A missing card leaves the description empty and the model will often pick the wrong base, so the create flow requires a description.

Workbench Preferences can change: default base, per-file cap (default 5 MB), per-base text cap (default 10 GB). Parsers: md/txt enabled; everything else disabled.

Base card fields: `id` / `title` / `description` / `aliases`. The system generates `id` as a UUID; it is immutable and hidden from the create/edit forms. `title` must be unique.

## How to use

1. **Create a base**: Settings → Zhiyuan → New. Title and description are required; titles must be unique, and the system generates the UUID; aliases are optional (e.g.「工作」「公司」). The ingest path never creates a base.
2. **Ingest**: Provide an existing `baseId` and category `destCategory` (empty = base root). Missing categories create folders; a missing base fails. The source path is read-only and is not modified.
3. **Ask**: Ask about facts in the library. The model should call `kb_list_bases`, then one `kb_search`. With no hits it must not say “according to the knowledge base”.
4. **Trial search**: The workbench search box calls search directly, without the model, to confirm it still works offline.

Slash commands (same fields as the tools):

```text
/kb ingest <path> --base <id> --to <destCategory>
/kb status
```

If `--to` is omitted, reuse that base’s last category; otherwise the command errors and asks for `--to` or `--root`. Do not add `/kb search` as the primary path.

## Tools for the AI

| Tool | Role |
|------|------|
| `kb_list_bases` | List bases: id / title / description / aliases / category names / approx. doc count. No filenames, no body text |
| `kb_ingest` | Copy into an existing base. `baseId` and `sourcePath` required; `destCategory` required in meaning |
| `kb_search` | Scan only the named base. Missing `baseId` fails validation. Prefer 3–8 `aliases`, one OR query |

Skill hard rules: if no base is named, list first; if two bases fit, ask the user; expand query terms only once; project `grep` / `glob` is not knowledge-base search; never invent a new base on ingest.

Hit cards in the conversation show path, excerpt, and a numeric id tag. Answers use Markdown inline code for citation ids (for example, `1`). Opening a card shows a read-only Markdown preview in DSH's right details column: no edits, and it does not jump to Settings.

## Verify

State implementation, install, activation, and runtime checks separately. Do not claim a check that was not run.

After install, at least confirm:

- `dsh --profile web --dump-config` shows this package layer
- Host loads; under a Web profile, Settings left nav shows「知源」
- Unload / reload does not crash; subscriptions and slots dispose

Happy path (product acceptance):

1. Create the “工作库” base, aliases: 工作, 公司. The system generates its UUID. Description must say this library is for clauses and meeting notes, not personal bills.
2. Ingest a local contract markdown into category `合同/2024` (the folder may not exist yet).
3. Disk path is `bases/<uuid>/合同/2024/…`; the source file is unchanged.
4. Ask about a termination clause: the model lists bases, then calls `kb_search` with the returned `baseId`; hits include line numbers.
5. Unplug the network: ingest again and trial-search again; both still succeed.

Must fail: ingest into a missing base; `destCategory` with `..` or an absolute path; `kb_search` without `baseId`; a single file over 5 MB (that file fails, others may continue); search on an empty base returns an empty list.

## Disable and uninstall

Remove this package from the profile’s dependency / bundle layer, then restart the Host. The Cordis row `zhiyuan` must disappear; Web must no longer inject the「知源」section.

Uninstall does **not** delete `bases/` or `catalog.json` in the plugin data directory. Delete that directory yourself if you want the local copies gone. Deleting a base or an entry deletes the knowledge-base copy, not the original source path.

## Develop

```sh
npm test
npm run build
```

A Git install runs `prepare` (builds `lib/`). Every path in `main` / `exports` / `files` / `dsh.bundle.patch` must exist after a clean build. Do not use `src/` as the runtime entry.

Read the [DeepSeek Harness plugin contract](https://dsh.pub/develop-plugin.md) before changing plugin code. This repository’s rules take precedence.

Product boundaries and milestones live in `design/` (especially the [implementation plan](./design/2026-08-31-06-dsh-知识库MVP实施计划.md) and the [checklist](./design/2026-08-31-07-dsh-知识库MVP待办.md)).
