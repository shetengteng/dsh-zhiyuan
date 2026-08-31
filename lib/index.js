// src/jobs.ts
function createJobRunner() {
  let chain = Promise.resolve();
  let running = false;
  let currentOp;
  const failed = [];
  return {
    enqueue(op, work) {
      const run = chain.then(async () => {
        running = true;
        currentOp = op;
        try {
          return await work();
        } catch (error) {
          failed.push({
            op,
            message: error instanceof Error ? error.message : String(error),
            at: Date.now()
          });
          throw error;
        } finally {
          running = false;
          currentOp = void 0;
        }
      });
      chain = run.then(() => void 0, () => void 0);
      return run;
    },
    status() {
      return { running, op: currentOp, failed: failed.slice(-20) };
    }
  };
}

// src/identity.ts
var PACKAGE_NAME = "dsh-zhiyuan";
var DATA_DIR_NAME = "dsh-zhiyuan";
var COMMAND_NAME = "kb";
var BASE_ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
var TEXT_EXTS = /* @__PURE__ */ new Set([".md", ".txt", ".markdown"]);
var DEFAULT_MAX_FILE_BYTES = 5242880;
var DEFAULT_MAX_BASE_BYTES = 10737418240;
var MAX_TOP_K = 20;
var MAX_ALIASES = 8;
var SEARCH_CONTEXT = 8;

// src/bases.ts
import { mkdir as mkdir2, readdir, readFile as readFile2, rm, stat, writeFile as writeFile2 } from "node:fs/promises";
import { join as join3, relative as relative2, sep as sep2 } from "node:path";

// src/catalog.ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

// src/paths.ts
import { existsSync as existsSync2, lstatSync, realpathSync } from "node:fs";
import { homedir as homedir2 } from "node:os";
import { isAbsolute, join as join2, normalize, relative, resolve, sep } from "node:path";

// src/host-resolve.ts
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
function existingFile(...parts) {
  const path = join(...parts);
  return existsSync(path) ? path : void 0;
}
function dshModuleRoots() {
  const roots = [];
  const home = process.env.DSH_HOME || join(homedir(), ".dsh");
  roots.push(join(home, "profiles", "node_modules"));
  roots.push(join(home, "node_modules"));
  const launcher = join(
    homedir(),
    "Library/Application Support/io.deepseek.DeepSeek.deepseek-harness-launcher/dsh"
  );
  if (existsSync(launcher)) {
    try {
      for (const name2 of readdirSync(launcher)) {
        roots.push(join(launcher, name2, "node_modules"));
      }
    } catch {
    }
  }
  return roots;
}
function resolveDshPackage(pkg, file) {
  for (const root of dshModuleRoots()) {
    const path = existingFile(root, pkg, file);
    if (path) return pathToFileURL(path).href;
  }
  return void 0;
}
async function importDsh(pkg, file) {
  const href = resolveDshPackage(pkg, file);
  if (!href) return void 0;
  return await import(href);
}

// src/types.ts
var KbError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "KbError";
    this.code = code;
  }
};

// src/paths.ts
var cachedRoot;
function fallbackDataRoot() {
  const home = process.env.DSH_HOME || join2(homedir2(), ".dsh");
  return join2(home, "data", DATA_DIR_NAME);
}
async function resolveDataRoot() {
  if (cachedRoot) return cachedRoot;
  const homePaths = await importDsh(
    "@deepseek-ai/dsh-home-paths",
    "lib/index.js"
  );
  cachedRoot = homePaths?.dshHomePath ? homePaths.dshHomePath("data", DATA_DIR_NAME) : fallbackDataRoot();
  return cachedRoot;
}
function basesRoot(dataRoot) {
  return join2(dataRoot, "bases");
}
function baseDir(dataRoot, baseId) {
  return join2(basesRoot(dataRoot), baseId);
}
function catalogPath(dataRoot) {
  return join2(dataRoot, "catalog.json");
}
function splitCategory(destCategory) {
  return destCategory.replaceAll("\\", "/").split("/").map((part) => part.trim()).filter(Boolean);
}
function assertInside(root, candidate) {
  const absRoot = resolve(root);
  const abs = resolve(candidate);
  const rel = relative(absRoot, abs);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new KbError("path_escape", `\u8DEF\u5F84\u5FC5\u987B\u4ECD\u5728 ${absRoot} \u4E0B`);
  }
  return abs;
}
function rejectEscapeTokens(segments) {
  for (const part of segments) {
    if (part === ".." || part === "." || part.includes("\0")) {
      throw new KbError("path_escape", "\u7C7B\u76EE\u4E0D\u80FD\u5305\u542B .. \u6216\u7EDD\u5BF9\u8DEF\u5F84");
    }
    if (part.includes(":") && part.length <= 2) {
      throw new KbError("path_escape", "\u7C7B\u76EE\u4E0D\u80FD\u5305\u542B\u7EDD\u5BF9\u8DEF\u5F84");
    }
  }
}
function resolveDest(dataRoot, baseId, destCategory) {
  if (isAbsolute(destCategory) || destCategory.startsWith("~")) {
    throw new KbError("path_escape", "\u7C7B\u76EE\u5FC5\u987B\u662F\u5E93\u5185\u76F8\u5BF9\u8DEF\u5F84");
  }
  const segments = splitCategory(destCategory);
  rejectEscapeTokens(segments);
  const joined = segments.join("/");
  const root = baseDir(dataRoot, baseId);
  const absolute = assertInside(root, join2(root, ...segments));
  const normalizedRel = relative(root, absolute).split(sep).join("/");
  if (normalizedRel === ".." || normalizedRel.startsWith("../")) {
    throw new KbError("path_escape", "\u89E3\u6790\u540E\u7684\u8DEF\u5F84\u9003\u51FA\u4E86\u5F53\u524D\u5E93");
  }
  return {
    relative: normalizedRel === "." ? "" : normalizedRel,
    absolute,
    segments,
    deep: segments.length > 4
  };
}
function assertNoSymlinkEscape(root, candidate) {
  const absRoot = resolve(root);
  let cursor = candidate;
  while (true) {
    if (existsSync2(cursor)) {
      const stat3 = lstatSync(cursor);
      if (stat3.isSymbolicLink()) {
        const real = realpathSync(cursor);
        const rel = relative(absRoot, real);
        if (rel.startsWith("..") || isAbsolute(rel)) {
          throw new KbError("path_escape", "\u7B26\u53F7\u94FE\u63A5\u4E0D\u80FD\u9003\u51FA\u77E5\u8BC6\u5E93\u76EE\u5F55");
        }
      }
    }
    const parent = resolve(cursor, "..");
    if (parent === cursor || relative(absRoot, parent).startsWith("..")) break;
    cursor = parent;
  }
}
function expandUserPath(sourcePath) {
  if (sourcePath === "~") return homedir2();
  if (sourcePath.startsWith("~/") || sourcePath.startsWith("~\\")) {
    return join2(homedir2(), sourcePath.slice(2));
  }
  return normalize(sourcePath);
}

// src/catalog.ts
function emptyCatalog() {
  return {
    version: 1,
    lastUsedBaseId: "",
    prefs: {
      defaultBaseId: "",
      maxFileBytes: DEFAULT_MAX_FILE_BYTES,
      maxBaseBytes: DEFAULT_MAX_BASE_BYTES
    },
    bases: []
  };
}
function asString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}
function asNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function parseCard(value) {
  if (!value || typeof value !== "object") return null;
  const rec = value;
  const id = asString(rec.id);
  const title = asString(rec.title);
  if (!id) return null;
  const aliases = Array.isArray(rec.aliases) ? rec.aliases.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
  return {
    id,
    title,
    description: asString(rec.description),
    aliases,
    createdAt: asNumber(rec.createdAt, 0),
    lastUsedAt: asNumber(rec.lastUsedAt, 0)
  };
}
function parsePrefs(value) {
  const rec = value && typeof value === "object" ? value : {};
  return {
    defaultBaseId: asString(rec.defaultBaseId),
    maxFileBytes: asNumber(rec.maxFileBytes, DEFAULT_MAX_FILE_BYTES),
    maxBaseBytes: asNumber(rec.maxBaseBytes, DEFAULT_MAX_BASE_BYTES)
  };
}
function parseCatalog(raw) {
  const rec = raw && typeof raw === "object" ? raw : {};
  const bases = Array.isArray(rec.bases) ? rec.bases.map(parseCard).filter((card) => Boolean(card)) : [];
  return {
    version: 1,
    lastUsedBaseId: asString(rec.lastUsedBaseId),
    prefs: parsePrefs(rec.prefs),
    bases
  };
}
async function readCatalog(dataRoot) {
  try {
    const text2 = await readFile(catalogPath(dataRoot), "utf8");
    return parseCatalog(JSON.parse(text2));
  } catch (error) {
    const code = error.code;
    if (code === "ENOENT") return emptyCatalog();
    throw error;
  }
}
async function writeCatalog(dataRoot, catalog) {
  const file = catalogPath(dataRoot);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(catalog, null, 2)}
`, "utf8");
}
function upsertBase(catalog, card) {
  const rest = catalog.bases.filter((item) => item.id !== card.id);
  return { ...catalog, bases: [...rest, card] };
}
function removeBase(catalog, id) {
  return {
    ...catalog,
    bases: catalog.bases.filter((item) => item.id !== id),
    lastUsedBaseId: catalog.lastUsedBaseId === id ? "" : catalog.lastUsedBaseId,
    prefs: {
      ...catalog.prefs,
      defaultBaseId: catalog.prefs.defaultBaseId === id ? "" : catalog.prefs.defaultBaseId
    }
  };
}
function cleanAliases(aliases) {
  if (!aliases) return [];
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const raw of aliases) {
    const value = raw.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

// src/bases.ts
function requireText(value, field) {
  const text2 = value?.trim() ?? "";
  if (!text2) throw new KbError("missing_field", `${field} \u5FC5\u586B`);
  return text2;
}
function requireId(id) {
  const value = requireText(id, "id");
  if (!BASE_ID_RE.test(value)) {
    throw new KbError("invalid_id", "id \u53EA\u80FD\u662F\u5C0F\u5199\u5B57\u6BCD\u3001\u6570\u5B57\u3001_ \u6216 -\uFF0C\u6700\u957F 64");
  }
  return value;
}
async function dirExists(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}
async function scanBaseIds(dataRoot) {
  const root = basesRoot(dataRoot);
  if (!await dirExists(root)) return [];
  const entries = await readdir(root, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name);
}
async function walkDocs(dir) {
  const files = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const path = join3(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walkDocs(path));
    else if (TEXT_EXTS.has(extOf(entry.name))) files.push(path);
  }
  return files;
}
function extOf(name2) {
  const index = name2.lastIndexOf(".");
  return index >= 0 ? name2.slice(index).toLowerCase() : "";
}
async function countDocs(dataRoot, baseId) {
  return (await walkDocs(baseDir(dataRoot, baseId))).length;
}
async function listCategories(dataRoot, baseId) {
  const root = baseDir(dataRoot, baseId);
  if (!await dirExists(root)) return [];
  const entries = await readdir(root, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name);
}
function cardFromDir(id) {
  return { id, title: id, description: "", aliases: [], createdAt: 0, lastUsedAt: 0 };
}
async function listBases(dataRoot) {
  const catalog = await readCatalog(dataRoot);
  const onDisk = await scanBaseIds(dataRoot);
  const byId = new Map(catalog.bases.map((card) => [card.id, card]));
  const ids = [.../* @__PURE__ */ new Set([...onDisk, ...catalog.bases.map((card) => card.id)])];
  const summaries = [];
  for (const id of ids.sort()) {
    const card = byId.get(id) ?? cardFromDir(id);
    summaries.push({
      ...card,
      categories: await listCategories(dataRoot, id),
      approxDocs: await countDocs(dataRoot, id),
      lastUsed: catalog.lastUsedBaseId === id
    });
  }
  return summaries;
}
async function createBase(dataRoot, input) {
  const id = requireId(input.id);
  const title = requireText(input.title, "title");
  const description = requireText(input.description, "description");
  const catalog = await readCatalog(dataRoot);
  if (catalog.bases.some((card2) => card2.id === id) || await dirExists(baseDir(dataRoot, id))) {
    throw new KbError("base_exists", `\u77E5\u8BC6\u5E93 ${id} \u5DF2\u5B58\u5728`);
  }
  const now = Date.now();
  const card = { id, title, description, aliases: cleanAliases(input.aliases), createdAt: now, lastUsedAt: now };
  await mkdir2(baseDir(dataRoot, id), { recursive: true });
  const next = upsertBase(catalog, card);
  if (!next.lastUsedBaseId) next.lastUsedBaseId = id;
  if (!next.prefs.defaultBaseId) next.prefs.defaultBaseId = id;
  await writeCatalog(dataRoot, next);
  return card;
}
async function updateBase(dataRoot, id, patch) {
  const catalog = await readCatalog(dataRoot);
  const current = catalog.bases.find((card2) => card2.id === id);
  if (!current) throw new KbError("base_missing", `\u77E5\u8BC6\u5E93 ${id} \u4E0D\u5B58\u5728\uFF0C\u8BF7\u5148\u5EFA\u5E93`);
  const card = {
    ...current,
    title: patch.title !== void 0 ? requireText(patch.title, "title") : current.title,
    description: patch.description !== void 0 ? requireText(patch.description, "description") : current.description,
    aliases: patch.aliases !== void 0 ? cleanAliases(patch.aliases) : current.aliases
  };
  await writeCatalog(dataRoot, upsertBase(catalog, card));
  return card;
}
async function deleteBase(dataRoot, id, confirm) {
  if (!confirm) throw new KbError("confirm_required", "\u5220\u9664\u77E5\u8BC6\u5E93\u9700\u8981\u786E\u8BA4");
  const catalog = await readCatalog(dataRoot);
  await rm(baseDir(dataRoot, id), { recursive: true, force: true });
  await writeCatalog(dataRoot, removeBase(catalog, id));
}
async function markUsed(dataRoot, id) {
  const catalog = await readCatalog(dataRoot);
  const current = catalog.bases.find((card) => card.id === id);
  if (!current) return;
  current.lastUsedAt = Date.now();
  catalog.lastUsedBaseId = id;
  await writeCatalog(dataRoot, catalog);
}
async function requireBase(dataRoot, id) {
  const catalog = await readCatalog(dataRoot);
  if (catalog.bases.some((card) => card.id === id) || await dirExists(baseDir(dataRoot, id))) return;
  throw new KbError("base_missing", `\u77E5\u8BC6\u5E93 ${id} \u4E0D\u5B58\u5728\uFF0C\u8BF7\u5148\u5EFA\u5E93`);
}
async function walkTree(root, dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nodes = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "zh"))) {
    const abs = join3(dir, entry.name);
    const path = relative2(root, abs).split(sep2).join("/");
    if (entry.isDirectory()) {
      nodes.push({ name: entry.name, kind: "dir", path, children: await walkTree(root, abs) });
      continue;
    }
    if (!TEXT_EXTS.has(extOf(entry.name))) continue;
    const info = await stat(abs);
    nodes.push({ name: entry.name, kind: "file", path, size: info.size, mtime: info.mtimeMs });
  }
  return nodes;
}
async function listTree(dataRoot, baseId) {
  await requireBase(dataRoot, baseId);
  const root = baseDir(dataRoot, baseId);
  if (!await dirExists(root)) return [];
  return walkTree(root, root);
}
async function readEntry(dataRoot, baseId, relPath) {
  await requireBase(dataRoot, baseId);
  const abs = resolveDest(dataRoot, baseId, relPath).absolute;
  assertNoSymlinkEscape(baseDir(dataRoot, baseId), abs);
  try {
    return { path: relPath, text: await readFile2(abs, "utf8") };
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new KbError("not_found", `\u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${relPath}`);
    }
    throw error;
  }
}
async function writeEntry(dataRoot, baseId, relPath, text2) {
  await requireBase(dataRoot, baseId);
  const abs = resolveDest(dataRoot, baseId, relPath).absolute;
  assertInside(baseDir(dataRoot, baseId), abs);
  await mkdir2(join3(abs, ".."), { recursive: true });
  await writeFile2(abs, text2, "utf8");
}
async function deleteEntry(dataRoot, baseId, relPath, confirm) {
  if (!confirm) throw new KbError("confirm_required", "\u5220\u9664\u6587\u4EF6\u6216\u7C7B\u76EE\u9700\u8981\u786E\u8BA4");
  await requireBase(dataRoot, baseId);
  const abs = resolveDest(dataRoot, baseId, relPath).absolute;
  assertInside(baseDir(dataRoot, baseId), abs);
  assertNoSymlinkEscape(baseDir(dataRoot, baseId), abs);
  await rm(abs, { recursive: true, force: true });
}

// src/ingest.ts
import { createHash } from "node:crypto";
import { createReadStream, existsSync as existsSync3 } from "node:fs";
import { copyFile, mkdir as mkdir3, readdir as readdir2, stat as stat2 } from "node:fs/promises";
import { basename, dirname as dirname2, extname, join as join4, relative as relative3, sep as sep3 } from "node:path";
function extOf2(name2) {
  return extname(name2).toLowerCase();
}
function isTextFile(name2) {
  return TEXT_EXTS.has(extOf2(name2));
}
async function sha256File(path) {
  const hash = createHash("sha256");
  await new Promise((resolve2, reject) => {
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve2());
  });
  return hash.digest("hex");
}
async function walkSource(source) {
  const info = await stat2(source);
  if (info.isFile()) return [source];
  const files = [];
  const entries = await readdir2(source, { withFileTypes: true });
  for (const entry of entries) {
    const path = join4(source, entry.name);
    if (entry.isDirectory()) files.push(...await walkSource(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}
async function existingHashes(root) {
  const map = /* @__PURE__ */ new Map();
  const files = await walkSource(root).catch(() => []);
  for (const file of files) {
    if (!isTextFile(file)) continue;
    map.set(await sha256File(file), relative3(root, file).split(sep3).join("/"));
  }
  return map;
}
async function dirSize(root) {
  let total = 0;
  const files = await walkSource(root).catch(() => []);
  for (const file of files) {
    if (!isTextFile(file)) continue;
    total += (await stat2(file)).size;
  }
  return total;
}
function uniqueName(dir, name2) {
  const ext = extname(name2);
  const stem = basename(name2, ext);
  let next = name2;
  let n = 2;
  while (existsSync3(join4(dir, next))) {
    next = `${stem}-${n}${ext}`;
    n += 1;
  }
  return next;
}
function sourceRel(sourceRoot, file, preserveTree) {
  if (!preserveTree) return basename(file);
  return relative3(sourceRoot, file).split(sep3).join("/");
}
async function ingest(dataRoot, input) {
  await requireBase(dataRoot, input.baseId);
  const catalog = await readCatalog(dataRoot);
  const source = expandUserPath(input.sourcePath);
  if (!existsSync3(source)) throw new KbError("not_found", `\u6E90\u8DEF\u5F84\u4E0D\u5B58\u5728\uFF1A${input.sourcePath}`);
  const dest = resolveDest(dataRoot, input.baseId, input.destCategory);
  const root = baseDir(dataRoot, input.baseId);
  assertInside(root, dest.absolute);
  const createMissing = input.createMissing !== false;
  const preserveTree = Boolean(input.preserveTree);
  if (createMissing) await mkdir3(dest.absolute, { recursive: true });
  else if (!existsSync3(dest.absolute)) {
    throw new KbError("not_found", `\u7C7B\u76EE\u4E0D\u5B58\u5728\uFF1A${dest.relative || "(\u5E93\u6839)"}`);
  }
  const hashes = await existingHashes(root);
  const currentBytes = await dirSize(root);
  const createdDirs = /* @__PURE__ */ new Set();
  if (createMissing && dest.relative) createdDirs.add(dest.relative);
  const sourceInfo = await stat2(source);
  const sourceRoot = sourceInfo.isDirectory() ? source : dirname2(source);
  const files = await walkSource(source);
  const result = {
    baseId: input.baseId,
    copied: [],
    renamed: [],
    skipped: 0,
    failed: 0,
    createdDirs: [],
    files: []
  };
  let added = 0;
  for (const file of files) {
    const item = await ingestOne({
      file,
      sourceRoot,
      destAbs: dest.absolute,
      destRel: dest.relative,
      preserveTree,
      root,
      hashes,
      maxFileBytes: catalog.prefs.maxFileBytes,
      maxBaseBytes: catalog.prefs.maxBaseBytes,
      currentBytes: currentBytes + added
    });
    result.files.push(item);
    if (item.status === "skipped") result.skipped += 1;
    else if (item.status === "failed") result.failed += 1;
    else {
      result.copied.push(item.relPath);
      if (item.status === "renamed") result.renamed.push(item.relPath);
      if (item.relPath.includes("/")) createdDirs.add(dirname2(item.relPath).split(sep3).join("/"));
      added += (await stat2(join4(root, item.relPath))).size;
    }
  }
  result.createdDirs = [...createdDirs].filter(Boolean);
  return result;
}
async function ingestOne(args) {
  const name2 = basename(args.file);
  if (!isTextFile(name2)) {
    return { relPath: name2, status: "failed", reason: "\u53EA\u652F\u6301 .md / .txt / .markdown" };
  }
  const size = (await stat2(args.file)).size;
  if (size > args.maxFileBytes) {
    return { relPath: name2, status: "failed", reason: `\u5355\u6587\u4EF6\u8D85\u8FC7 ${args.maxFileBytes} \u5B57\u8282` };
  }
  if (args.currentBytes + size > args.maxBaseBytes) {
    return { relPath: name2, status: "failed", reason: "\u672C\u6279\u5BFC\u5165\u5C06\u8D85\u8FC7\u5355\u5E93\u6587\u5B57\u4E0A\u9650" };
  }
  const digest = await sha256File(args.file);
  if (args.hashes.has(digest)) {
    return { relPath: args.hashes.get(digest) ?? name2, status: "skipped", reason: "\u540C\u6307\u7EB9\u5DF2\u5728\u5E93\u4E2D" };
  }
  const relFromSource = sourceRel(args.sourceRoot, args.file, args.preserveTree);
  const intended = join4(args.destAbs, relFromSource);
  assertInside(args.root, intended);
  assertNoSymlinkEscape(args.root, dirname2(intended));
  await mkdir3(dirname2(intended), { recursive: true });
  let destFile = intended;
  let status = "copied";
  if (existsSync3(destFile)) {
    destFile = join4(dirname2(intended), uniqueName(dirname2(intended), basename(intended)));
    status = "renamed";
  }
  await copyFile(args.file, destFile);
  const relPath = relative3(args.root, destFile).split(sep3).join("/");
  args.hashes.set(digest, relPath);
  return { relPath, status };
}

// src/search.ts
import { spawn } from "node:child_process";
import { existsSync as existsSync4 } from "node:fs";
import { isAbsolute as isAbsolute2, join as join5, relative as relative4, sep as sep4 } from "node:path";
function mergeTerms(query, aliases) {
  const warnings = [];
  const raw = [query, ...aliases ?? []].map((item) => item.trim()).filter(Boolean);
  const seen = /* @__PURE__ */ new Set();
  const terms = [];
  for (const term of raw) {
    if (seen.has(term)) continue;
    seen.add(term);
    terms.push(term);
  }
  if (terms.length > MAX_ALIASES) {
    warnings.push(`aliases \u8D85\u8FC7 ${MAX_ALIASES} \u4E2A\uFF0C\u5DF2\u622A\u65AD`);
    return { terms: terms.slice(0, MAX_ALIASES), warnings };
  }
  return { terms, warnings };
}
function parseRg(stdout, rootDir) {
  const matches = [];
  let currentPath = "";
  for (const raw of stdout.split(/\r?\n/)) {
    if (!raw) {
      currentPath = "";
      continue;
    }
    if (raw === "--") continue;
    const m = raw.match(/^(.*?):(\d+):(.*)$/);
    const ctx = raw.match(/^(.*?)-(\d+)-(.*)$/);
    const hit = m ?? ctx;
    if (!hit) continue;
    const printed = hit[1];
    const abs = isAbsolute2(printed) ? printed : join5(rootDir, printed);
    const rel = relative4(rootDir, abs).split(sep4).join("/");
    currentPath = rel || currentPath;
    if (m) matches.push({ path: currentPath || rel, line: Number(m[2]), text: m[3] });
  }
  return matches;
}
function clipAround(lines, center, radius) {
  const start = Math.max(1, center - radius);
  const end = Math.min(lines.length, center + radius);
  return { start, end, excerpt: lines.slice(start - 1, end).join("\n") };
}
function mergeAdjacent(hits) {
  const sorted = [...hits].sort((a, b) => a.file.localeCompare(b.file) || a.startLine - b.startLine);
  const out = [];
  for (const hit of sorted) {
    const prev = out.at(-1);
    if (prev && prev.file === hit.file && hit.startLine <= prev.endLine + 1) {
      prev.endLine = Math.max(prev.endLine, hit.endLine);
      prev.excerpt = hit.startLine < prev.startLine ? `${hit.excerpt}
${prev.excerpt}` : `${prev.excerpt}
${hit.excerpt}`;
      prev.startLine = Math.min(prev.startLine, hit.startLine);
      continue;
    }
    out.push({ ...hit });
  }
  return out;
}
function diversify(hits, topK) {
  const counts = /* @__PURE__ */ new Map();
  const picked = [];
  const rest = [...hits];
  while (picked.length < topK && rest.length) {
    rest.sort((a, b) => (counts.get(a.file) ?? 0) - (counts.get(b.file) ?? 0));
    const next = rest.shift();
    if (!next) break;
    counts.set(next.file, (counts.get(next.file) ?? 0) + 1);
    picked.push(next);
  }
  return picked.map((hit, index) => ({
    n: index + 1,
    path: hit.path,
    startLine: hit.startLine,
    endLine: hit.endLine,
    excerpt: hit.excerpt
  }));
}
async function resolveRg() {
  const mod = await import("@vscode/ripgrep");
  const path = mod.rgPath;
  if (!path || !existsSync4(path)) throw new Error("\u627E\u4E0D\u5230\u6253\u5305\u7684 ripgrep");
  return path;
}
function runRg(bin, args, cwd) {
  return new Promise((resolve2, reject) => {
    const child = spawn(bin, args, { cwd, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 || code === 1) resolve2(stdout);
      else reject(new Error(stderr.trim() || `rg \u9000\u51FA ${code}`));
    });
  });
}
var RipgrepSearchEngine = class {
  async search(input) {
    if (!existsSync4(input.rootDir)) return [];
    const bin = await resolveRg();
    const args = ["-n", "-C", String(SEARCH_CONTEXT), "--glob", "*.md", "--glob", "*.txt", "--glob", "*.markdown"];
    for (const term of input.terms) args.push("-e", term);
    args.push(".");
    const stdout = await runRg(bin, args, input.rootDir);
    const matches = parseRg(stdout, input.rootDir);
    const { readFile: readFile3 } = await import("node:fs/promises");
    const { join: join6 } = await import("node:path");
    const raw = [];
    for (const match of matches) {
      const abs = join6(input.rootDir, match.path);
      const lines = existsSync4(abs) ? (await readFile3(abs, "utf8")).split(/\r?\n/) : [match.text];
      const clip = clipAround(lines, match.line, SEARCH_CONTEXT);
      raw.push({
        n: 0,
        file: match.path,
        path: match.path,
        startLine: clip.start,
        endLine: clip.end,
        excerpt: clip.excerpt
      });
    }
    return diversify(mergeAdjacent(raw), input.topK);
  }
};
async function searchBase(dataRoot, input, engine = new RipgrepSearchEngine()) {
  if (!input.baseId?.trim()) throw new KbError("missing_field", "kb_search \u5FC5\u987B\u5E26 baseId");
  if (!input.query?.trim()) throw new KbError("missing_field", "query \u5FC5\u586B");
  await requireBase(dataRoot, input.baseId);
  const { terms, warnings } = mergeTerms(input.query, input.aliases);
  const topK = Math.min(MAX_TOP_K, Math.max(1, input.topK ?? 12));
  let rootDir = baseDir(dataRoot, input.baseId);
  if (input.category?.trim()) {
    try {
      const dest = resolveDest(dataRoot, input.baseId, input.category);
      if (existsSync4(dest.absolute)) rootDir = dest.absolute;
    } catch {
    }
  }
  const hits = await engine.search({ baseId: input.baseId, rootDir, terms, topK });
  await markUsed(dataRoot, input.baseId);
  return { hits, warnings };
}

// src/command-parse.ts
function parseFlags(tokens) {
  const rest = [];
  const flags = {};
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token.startsWith("--")) {
      rest.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = tokens[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    i += 1;
  }
  return { sub: rest[0] ?? "", rest: rest.slice(1), flags };
}
function flagString(flags, key) {
  const value = flags[key];
  return typeof value === "string" ? value : void 0;
}
function flagBool(flags, key, fallback = false) {
  const value = flags[key];
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return fallback;
}
function splitAliases(value) {
  if (!value) return [];
  return value.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
}
function tokenize(rawInput) {
  const out = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m;
  while (m = re.exec(rawInput)) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

// src/commands.ts
function ok(value) {
  return { kind: "success", text: typeof value === "string" ? value : JSON.stringify(value) };
}
function fail(error) {
  return { kind: "error", text: error instanceof Error ? error.message : String(error) };
}
async function handleCall(payload, jobs) {
  const data = JSON.parse(payload);
  const op = String(data.op ?? "");
  const root = await resolveDataRoot();
  switch (op) {
    case "list":
      return listBases(root);
    case "create":
      return createBase(root, {
        id: String(data.id ?? ""),
        title: String(data.title ?? ""),
        description: String(data.description ?? ""),
        aliases: Array.isArray(data.aliases) ? data.aliases.map(String) : []
      });
    case "update":
      return updateBase(root, String(data.id ?? ""), {
        title: data.title,
        description: data.description,
        aliases: Array.isArray(data.aliases) ? data.aliases.map(String) : void 0
      });
    case "deleteBase":
      await deleteBase(root, String(data.id ?? ""), Boolean(data.confirm));
      return { ok: true };
    case "tree":
      return listTree(root, String(data.id ?? ""));
    case "read":
      return readEntry(root, String(data.id ?? ""), String(data.path ?? ""));
    case "write":
      await writeEntry(root, String(data.id ?? ""), String(data.path ?? ""), String(data.text ?? ""));
      return { ok: true };
    case "deleteEntry":
      await deleteEntry(root, String(data.id ?? ""), String(data.path ?? ""), Boolean(data.confirm));
      return { ok: true };
    case "ingest":
      return jobs.enqueue("ingest", () => ingest(root, {
        baseId: String(data.baseId ?? ""),
        sourcePath: String(data.sourcePath ?? ""),
        destCategory: String(data.destCategory ?? ""),
        preserveTree: Boolean(data.preserveTree),
        createMissing: data.createMissing !== false
      }));
    case "search":
      return searchBase(root, {
        baseId: String(data.baseId ?? ""),
        query: String(data.query ?? ""),
        aliases: Array.isArray(data.aliases) ? data.aliases.map(String) : void 0,
        category: typeof data.category === "string" ? data.category : void 0,
        topK: typeof data.topK === "number" ? data.topK : void 0
      });
    case "prefs":
      return (await readCatalog(root)).prefs;
    case "setPrefs": {
      const catalog = await readCatalog(root);
      if (typeof data.defaultBaseId === "string") catalog.prefs.defaultBaseId = data.defaultBaseId;
      if (typeof data.maxFileBytes === "number") catalog.prefs.maxFileBytes = data.maxFileBytes;
      if (typeof data.maxBaseBytes === "number") catalog.prefs.maxBaseBytes = data.maxBaseBytes;
      await writeCatalog(root, catalog);
      return catalog.prefs;
    }
    default:
      throw new KbError("missing_field", `\u672A\u77E5\u64CD\u4F5C ${op}`);
  }
}
async function handleIngest(rest, flags, jobs) {
  const path = rest[0] ?? flagString(flags, "path");
  const baseId = flagString(flags, "base");
  if (!path) throw new KbError("missing_field", "\u7528\u6CD5\uFF1A/kb ingest <path> --base <id> --to <\u7C7B\u76EE>");
  if (!baseId) throw new KbError("missing_field", "\u5BFC\u5165\u5FC5\u987B\u6307\u5B9A --base");
  const dest = flagString(flags, "to");
  if (dest === void 0 && !flagBool(flags, "root", false)) {
    throw new KbError("missing_field", "\u8BF7\u6307\u5B9A --to <\u7C7B\u76EE>\uFF0C\u6216 --root \u5BFC\u5165\u5230\u5E93\u6839");
  }
  const root = await resolveDataRoot();
  return jobs.enqueue("ingest", () => ingest(root, {
    baseId,
    sourcePath: path,
    destCategory: dest ?? "",
    preserveTree: flagBool(flags, "preserve-tree"),
    createMissing: !flagBool(flags, "no-create")
  }));
}
function registerKbCommands(ctx, jobs) {
  ctx.commands.register({
    name: COMMAND_NAME,
    description: "\u77E5\u6E90\u77E5\u8BC6\u5E93\uFF1Aingest / status / call",
    input: { hint: "ingest <path> --base <id> --to <\u7C7B\u76EE> | status | call {json}" },
    recordInput: false,
    handler: async ({ rawInput }) => {
      const tokens = tokenize(rawInput.trim());
      const parsed = parseFlags(tokens);
      try {
        if (parsed.sub === "status" || !parsed.sub) return ok(jobs.status());
        if (parsed.sub === "ingest") return ok(await handleIngest(parsed.rest, parsed.flags, jobs));
        if (parsed.sub === "call") return ok(await handleCall(parsed.rest.join(" "), jobs));
        if (parsed.sub === "search") {
          const root = await resolveDataRoot();
          return ok(await searchBase(root, {
            baseId: flagString(parsed.flags, "base") ?? "",
            query: parsed.rest.join(" ") || flagString(parsed.flags, "query") || "",
            aliases: splitAliases(flagString(parsed.flags, "aliases")),
            category: flagString(parsed.flags, "to") ?? flagString(parsed.flags, "category")
          }));
        }
        return { kind: "error", text: "\u7528\u6CD5\uFF1A/kb ingest <path> --base <id> --to <\u7C7B\u76EE> \u6216 /kb status" };
      } catch (error) {
        return fail(error);
      }
    }
  });
}

// src/tools.ts
function asRecord(args) {
  return args && typeof args === "object" && !Array.isArray(args) ? args : {};
}
function requireString(args, key) {
  const value = args[key];
  if (typeof value !== "string" || !value.trim()) throw new KbError("missing_field", `${key} \u5FC5\u586B`);
  return value;
}
function asString2(value) {
  return typeof value === "string" ? value : void 0;
}
function asBool(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}
function asStringArray(value) {
  if (!Array.isArray(value)) return void 0;
  return value.filter((item) => typeof item === "string");
}
function text(value) {
  return [{ type: "text", text: value }];
}
function fail2(error) {
  if (error instanceof KbError) throw new Error(error.message);
  throw error;
}
function registerKbTools(ctx, jobs = createJobRunner()) {
  ctx.tools.register({
    name: "kb_list_bases",
    description: "\u5217\u51FA\u5DF2\u521B\u5EFA\u7684\u77E5\u8BC6\u5E93\u5361\u7247\uFF1Aid\u3001\u6807\u9898\u3001\u63CF\u8FF0\u3001\u522B\u540D\u3001\u7C7B\u76EE\u540D\u3001\u7EA6\u591A\u5C11\u7BC7\u3002\u4E0D\u542B\u6587\u4EF6\u540D\u548C\u6B63\u6587\u3002\u9009\u5E93\u65F6\u5148\u8C03\u7528\u672C\u5DE5\u5177\u3002",
    parameters: { type: "object" },
    output: {
      schema: { type: "object", properties: { bases: { type: "array" } } },
      render: (_args, value) => {
        const bases = value?.bases ?? [];
        return text(bases.map((item) => `${item.id} ${item.title}`).join(" \xB7 ") || "\u8FD8\u6CA1\u6709\u77E5\u8BC6\u5E93");
      }
    },
    isConcurrencySafe: () => true,
    execute: async () => {
      try {
        const dataRoot = await resolveDataRoot();
        return { bases: await listBases(dataRoot) };
      } catch (error) {
        fail2(error);
      }
    }
  });
  ctx.tools.register({
    name: "kb_ingest",
    description: "\u628A\u672C\u673A md/txt \u62F7\u8FDB\u5DF2\u6709\u77E5\u8BC6\u5E93\u7684\u6307\u5B9A\u7C7B\u76EE\u3002\u5E93\u5FC5\u987B\u5DF2\u5B58\u5728\u3002\u4E0D\u8981\u731C\u6D4B\u65B0\u5E93\u3002destCategory \u4E3A\u7A7A\u8868\u793A\u5E93\u6839\u3002",
    parameters: {
      type: "object",
      required: ["baseId", "sourcePath"],
      properties: {
        baseId: { type: "string", description: "\u5DF2\u5B58\u5728\u7684\u77E5\u8BC6\u5E93 id" },
        sourcePath: { type: "string", description: "\u672C\u673A\u6587\u4EF6\u6216\u6587\u4EF6\u5939\u8DEF\u5F84\uFF0C\u53EA\u8BFB\u6E90" },
        destCategory: { type: "string", description: "\u5E93\u5185\u76F8\u5BF9\u7C7B\u76EE\uFF0C\u5982 \u5408\u540C/2024\uFF1B\u7A7A=\u5E93\u6839" },
        preserveTree: { type: "boolean", description: "\u6E90\u662F\u6587\u4EF6\u5939\u65F6\u662F\u5426\u4FDD\u7559\u76F8\u5BF9\u5B50\u76EE\u5F55\uFF0C\u9ED8\u8BA4 false" },
        createMissing: { type: "boolean", description: "\u7C7B\u76EE\u4E0D\u5B58\u5728\u5219\u521B\u5EFA\uFF0C\u9ED8\u8BA4 true\u3002\u4E0D\u5EFA\u65B0\u5E93" }
      }
    },
    output: {
      schema: { type: "object" },
      render: (_args, value) => {
        const r = value;
        return text(`\u5BFC\u5165 ${r.copied?.length ?? 0} \xB7 \u8DF3\u8FC7 ${r.skipped ?? 0} \xB7 \u5931\u8D25 ${r.failed ?? 0}`);
      }
    },
    execute: async (args) => {
      const rec = asRecord(args);
      try {
        const dataRoot = await resolveDataRoot();
        return await jobs.enqueue("ingest", () => ingest(dataRoot, {
          baseId: requireString(rec, "baseId"),
          sourcePath: requireString(rec, "sourcePath"),
          destCategory: asString2(rec.destCategory) ?? "",
          preserveTree: asBool(rec.preserveTree, false),
          createMissing: asBool(rec.createMissing, true)
        }));
      } catch (error) {
        fail2(error);
      }
    }
  });
  ctx.tools.register({
    name: "kb_search",
    description: "\u5728\u6307\u5B9A\u77E5\u8BC6\u5E93\u91CC\u4E00\u6B21\u591A\u8BCD grep\u3002\u5FC5\u987B\u5E26 baseId\u3002\u6362\u8BCD\u653E\u8FDB aliases\uFF083\uFF5E8\uFF09\u3002\u6CA1\u547D\u4E2D\u8FD4\u56DE\u7A7A\u5217\u8868\uFF0C\u4E0D\u8981\u7F16\u9020\u3002",
    parameters: {
      type: "object",
      required: ["baseId", "query"],
      properties: {
        baseId: { type: "string", description: "\u5FC5\u586B\u3002\u7981\u6B62\u7701\u7565\u540E\u626B\u5168\u90E8\u5E93" },
        query: { type: "string", description: "\u4E3B\u5173\u952E\u8BCD" },
        aliases: { type: "array", items: { type: "string" }, description: "3\uFF5E8 \u4E2A\u540C\u4E49\u8BCD\uFF0C\u4E0E query \u5408\u5E76\u4E00\u6B21 OR" },
        category: { type: "string", description: "\u5BF9\u4E0A\u5B50\u6587\u4EF6\u5939\u5219\u53EA\u626B\u90A3\u4E00\u5C42\uFF1B\u5BF9\u4E0D\u4E0A\u5219\u672C\u5E93\u5168\u626B" },
        topK: { type: "number", description: "\u9ED8\u8BA4 12\uFF0C\u4E0A\u9650 20" }
      }
    },
    output: {
      schema: { type: "object", properties: { hits: { type: "array" }, warnings: { type: "array" } } },
      render: (_args, value) => {
        const hits = value?.hits ?? [];
        return text(hits.length ? hits.map((hit) => `[${hit.n}] ${hit.path}`).join("\n") : "\u65E0\u547D\u4E2D");
      },
      presentationMeta: (_args, value) => value
    },
    presentCall: () => ({ card: "generic", title: "\u77E5\u8BC6\u5E93\u68C0\u7D22" }),
    presentResult: (_args, result) => result.isError ? { card: "generic", title: "\u68C0\u7D22\u5931\u8D25" } : { card: "generic", title: "\u77E5\u8BC6\u5E93\u547D\u4E2D" },
    execute: async (args) => {
      const rec = asRecord(args);
      if (typeof rec.baseId !== "string" || !rec.baseId.trim()) {
        throw new Error("kb_search \u5FC5\u987B\u5E26 baseId");
      }
      try {
        const dataRoot = await resolveDataRoot();
        return await searchBase(dataRoot, {
          baseId: rec.baseId,
          query: requireString(rec, "query"),
          aliases: asStringArray(rec.aliases),
          category: asString2(rec.category),
          topK: typeof rec.topK === "number" ? rec.topK : void 0
        });
      } catch (error) {
        fail2(error);
      }
    }
  });
}

// src/skill.ts
var SKILL_BODY = [
  "# \u77E5\u6E90 \xB7 \u77E5\u8BC6\u5E93\u68C0\u7D22",
  "",
  "\u4F60\u901A\u8FC7\u672C\u63D2\u4EF6\u67E5\u8BE2\u7528\u6237\u663E\u5F0F\u5BFC\u5165\u7684\u77E5\u8BC6\u5E93\u3002\u539F\u6587\u5728\u672C\u673A\u6587\u4EF6\u5939\u91CC\u3002",
  "",
  "## \u4F55\u65F6\u4F7F\u7528",
  "\u7528\u6237\u95EE\u5DF2\u5BFC\u5165\u8D44\u6599\u91CC\u7684\u4E8B\u5B9E\u3001\u6761\u6B3E\u3001\u7EAA\u8981\u3001\u8BF4\u660E\u65F6\u4F7F\u7528\u3002\u4E0D\u8981\u7528\u5F53\u524D\u9879\u76EE\u7684 grep / glob / read \u5192\u5145\u77E5\u8BC6\u5E93\u68C0\u7D22\u3002",
  "",
  "## \u9009\u5E93\uFF08\u5FC5\u987B\uFF09",
  "1. \u7528\u6237\u6CA1\u70B9\u540D\u5E93\uFF1A\u5FC5\u987B\u5148\u8C03\u7528 `kb_list_bases`\uFF0C\u7528\u5404\u5E93\u7684 description \u548C aliases \u9009\u4E00\u4E2A `baseId`\u3002",
  "2. \u4E24\u4E2A\u5E93\u90FD\u50CF\uFF1A\u95EE\u4EBA\uFF0C\u4E0D\u8981\u4E24\u4E2A\u90FD\u641C\uFF0C\u4E0D\u8981\u9ED8\u8BA4\u626B\u5168\u90E8 bases\u3002",
  "3. \u7528\u6237\u5DF2\u7ECF\u70B9\u540D\u5E93\u6216\u7ED9\u51FA id\uFF1A\u76F4\u63A5\u7528\u90A3\u4E2A `baseId`\u3002",
  "",
  "## \u68C0\u7D22",
  "- \u6362\u8BCD\u53EA\u505A\u4E00\u6B21\uFF0C\u653E\u8FDB\u540C\u4E00\u6B21 `kb_search` \u7684 `aliases`\uFF083\uFF5E8 \u4E2A\uFF09\u3002\u7981\u6B62\u8FDE\u8C03\u4E09\u5341\u8F6E\u3002",
  "- `kb_search` \u5FC5\u987B\u5E26 `baseId`\u3002\u6CA1\u6709 baseId \u4E0D\u8981\u8C03\u7528\u3002",
  "- \u53EF\u9009 `category`\uFF1A\u53EA\u6709\u5BF9\u4E0A\u5B50\u6587\u4EF6\u5939\u540D\u65F6\u624D\u6536\u7A84\uFF1B\u5BF9\u4E0D\u4E0A\u5C31\u672C\u5E93\u5168\u626B\uFF0C\u4E0D\u8981\u731C\u3002",
  "",
  "## \u51FA\u5904",
  "- \u6CA1\u547D\u4E2D\uFF1A\u4E0D\u5F97\u8BF4\u300C\u6839\u636E\u77E5\u8BC6\u5E93\u300D\u3002\u4E0D\u8981\u7F16\u4E00\u6BB5\u53EF\u80FD\u76F8\u5173\u7684\u6761\u6B3E\u3002",
  "- \u547D\u4E2D\uFF1A\u5FC5\u987B\u5E26\u6587\u4EF6\u8DEF\u5F84\u548C\u7247\u6BB5\u7F16\u53F7 `[n]`\u3002",
  "",
  "## \u5BFC\u5165",
  "- \u7528\u6237\u8BDD\u91CC\u6CA1\u6709\u5E93\u540D\u5C31\u5148\u95EE\u3002\u7981\u6B62\u731C\u4E00\u4E2A\u65B0\u5E93\u3002\u7981\u6B62\u65E0 destCategory \u5C31\u6563\u843D\u3002",
  "- \u5BFC\u5165\u4E0D\u4F1A\u81EA\u52A8\u5EFA\u5E93\u3002\u5E93\u4E0D\u5B58\u5728\u65F6\u63D0\u793A\u5148\u5EFA\u5E93\u3002"
].join("\n");
var ZHIYUAN_SKILL = {
  name: "zhiyuan-kb",
  description: "\u4ECE\u7528\u6237\u6307\u5B9A\u7684\u77E5\u8BC6\u5E93\u91CC\u67E5\u627E\u539F\u6587\u7247\u6BB5\u3002\u6CA1\u70B9\u540D\u5E93\u65F6\u5148 kb_list_bases\uFF1B\u6CA1\u547D\u4E2D\u4E0D\u5F97\u8BF4\u6839\u636E\u77E5\u8BC6\u5E93\u3002",
  whenToUse: "\u7528\u6237\u8BE2\u95EE\u5DF2\u5BFC\u5165\u77E5\u8BC6\u5E93\u4E2D\u7684\u4E8B\u5B9E\u3001\u6761\u6B3E\u3001\u7EAA\u8981\uFF0C\u6216\u8981\u6C42\u5BFC\u5165\u672C\u673A md/txt\u3002",
  source: "runtime",
  content: SKILL_BODY
};
var ZHIYUAN_PROMPT_SECTION = {
  name: "zhiyuan:identity",
  order: 170,
  text: [
    "\u77E5\u6E90\uFF08\u77E5\u8BC6\u5E93\uFF09\uFF1A\u67E5\u8BE2\u5DF2\u5BFC\u5165\u8D44\u6599\u5FC5\u987B\u5148\u9009\u5B9A\u4E00\u4E2A baseId\u3002",
    "\u7528\u6237\u6CA1\u70B9\u540D\u5E93\u65F6\u5148 kb_list_bases\uFF0C\u7528\u63CF\u8FF0\u548C\u522B\u540D\u9009\u4E00\u4E2A\u5E93\uFF1B\u4E24\u4E2A\u90FD\u50CF\u5C31\u95EE\u4EBA\u3002",
    "\u7981\u6B62\u626B\u5168\u90E8 bases\u3002\u6362\u8BCD\u53EA\u505A\u4E00\u6B21\uFF0C\u653E\u8FDB\u540C\u4E00\u6B21 kb_search \u7684 aliases\u3002",
    "\u6CA1\u547D\u4E2D\u4E0D\u5F97\u8BF4\u300C\u6839\u636E\u77E5\u8BC6\u5E93\u300D\u3002\u5F53\u524D\u9879\u76EE\u7684 grep / glob \u4E0D\u7B97\u77E5\u8BC6\u5E93\u68C0\u7D22\u3002"
  ].join("")
};
function registerZhiyuanSkill(ctx) {
  ctx.skills?.register(ZHIYUAN_SKILL);
}
function registerZhiyuanPrompt(ctx) {
  ctx.systemPrompt?.section(ZHIYUAN_PROMPT_SECTION);
}

// src/index.ts
var name = PACKAGE_NAME;
function apply(ctx) {
  const jobs = createJobRunner();
  console.log("[zhiyuan] host loaded");
  ctx.logger?.info("[zhiyuan] host loaded");
  ctx.inject(["commands"], (scoped) => {
    registerKbCommands(scoped, jobs);
  });
  ctx.inject(["tools"], (scoped) => {
    registerKbTools(scoped, jobs);
  });
  ctx.inject(["skills"], (scoped) => {
    registerZhiyuanSkill(scoped);
  });
  ctx.inject(["systemPrompt"], (scoped) => {
    registerZhiyuanPrompt(scoped);
  });
  ctx.effect?.(() => {
    void resolveDataRoot().then((root) => ctx.logger?.info(`[zhiyuan] data root ${root}`));
    return () => {
      console.log("[zhiyuan] host unloaded");
    };
  });
}
export {
  apply,
  name
};
