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
var TEXT_EXTS = /* @__PURE__ */ new Set([".md", ".txt", ".markdown"]);
var DEFAULT_MAX_FILE_BYTES = 5242880;
var DEFAULT_MAX_BASE_BYTES = 10737418240;
var DEFAULT_TOP_K = 12;
var MAX_TOP_K = 20;
var MAX_ALIASES = 8;
var SEARCH_CONTEXT = 8;
var CATEGORY_WARN_DEPTH = 4;

// src/bases.ts
import { mkdir as mkdir2, readdir, readFile as readFile2, rm, stat, writeFile as writeFile2 } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname as dirname2, join as join3, relative as relative2, sep as sep2 } from "node:path";

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
  if (process.platform === "darwin") {
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
var cachedDataRoot;
function fallbackDataRoot() {
  const home = process.env.DSH_HOME || join2(homedir2(), ".dsh");
  return join2(home, "data", DATA_DIR_NAME);
}
async function resolveDataRoot() {
  if (cachedDataRoot) return cachedDataRoot;
  const homePaths = await importDsh(
    "@deepseek-ai/dsh-home-paths",
    "lib/index.js"
  );
  cachedDataRoot = homePaths?.dshHomePath ? homePaths.dshHomePath("data", DATA_DIR_NAME) : fallbackDataRoot();
  return cachedDataRoot;
}
function clearDataRootCache() {
  cachedDataRoot = void 0;
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
function splitCategory(destinationCategory) {
  return destinationCategory.replaceAll("\\", "/").split("/").map((part) => part.trim()).filter(Boolean);
}
function assertInside(baseRoot, candidatePath) {
  const absoluteRoot = resolve(baseRoot);
  const absoluteCandidate = resolve(candidatePath);
  const relativePath = relative(absoluteRoot, absoluteCandidate);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new KbError("path_escape", `\u8DEF\u5F84\u5FC5\u987B\u4ECD\u5728 ${absoluteRoot} \u4E0B`);
  }
  return absoluteCandidate;
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
function resolveDest(dataRoot, baseId, destinationCategory) {
  if (isAbsolute(destinationCategory) || destinationCategory.startsWith("~")) {
    throw new KbError("path_escape", "\u7C7B\u76EE\u5FC5\u987B\u662F\u5E93\u5185\u76F8\u5BF9\u8DEF\u5F84");
  }
  const categorySegments = splitCategory(destinationCategory);
  rejectEscapeTokens(categorySegments);
  const baseRoot = baseDir(dataRoot, baseId);
  const absoluteDestination = assertInside(baseRoot, join2(baseRoot, ...categorySegments));
  const normalizedRelativePath = relative(baseRoot, absoluteDestination).split(sep).join("/");
  if (normalizedRelativePath === ".." || normalizedRelativePath.startsWith("../")) {
    throw new KbError("path_escape", "\u89E3\u6790\u540E\u7684\u8DEF\u5F84\u9003\u51FA\u4E86\u5F53\u524D\u5E93");
  }
  return {
    relative: normalizedRelativePath === "." ? "" : normalizedRelativePath,
    absolute: absoluteDestination,
    segments: categorySegments,
    deep: categorySegments.length > 4
  };
}
function assertNoSymlinkEscape(baseRoot, candidatePath) {
  const absoluteRoot = resolve(baseRoot);
  let currentPath = candidatePath;
  while (true) {
    if (existsSync2(currentPath)) {
      const stat3 = lstatSync(currentPath);
      if (stat3.isSymbolicLink()) {
        const realPath = realpathSync(currentPath);
        const relativeRealPath = relative(absoluteRoot, realPath);
        if (relativeRealPath.startsWith("..") || isAbsolute(relativeRealPath)) {
          throw new KbError("path_escape", "\u7B26\u53F7\u94FE\u63A5\u4E0D\u80FD\u9003\u51FA\u77E5\u8BC6\u5E93\u76EE\u5F55");
        }
      }
    }
    const parentPath = resolve(currentPath, "..");
    if (parentPath === currentPath || relative(absoluteRoot, parentPath).startsWith("..")) break;
    currentPath = parentPath;
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
  const record = value;
  const id = asString(record.id);
  const title = asString(record.title).trim();
  if (!id) return null;
  const aliases = Array.isArray(record.aliases) ? record.aliases.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
  const card = {
    id,
    title,
    description: asString(record.description),
    aliases,
    createdAt: asNumber(record.createdAt, 0),
    lastUsedAt: asNumber(record.lastUsedAt, 0)
  };
  if (typeof record.lastDestCategory === "string") card.lastDestCategory = record.lastDestCategory;
  return card;
}
function parsePrefs(value) {
  const record = value && typeof value === "object" ? value : {};
  return {
    defaultBaseId: asString(record.defaultBaseId),
    maxFileBytes: asNumber(record.maxFileBytes, DEFAULT_MAX_FILE_BYTES),
    maxBaseBytes: asNumber(record.maxBaseBytes, DEFAULT_MAX_BASE_BYTES)
  };
}
function parseCatalog(raw) {
  const record = raw && typeof raw === "object" ? raw : {};
  const bases = Array.isArray(record.bases) ? record.bases.map(parseCard).filter((card) => Boolean(card)) : [];
  return {
    version: 1,
    lastUsedBaseId: asString(record.lastUsedBaseId),
    prefs: parsePrefs(record.prefs),
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
  const remainingCards = catalog.bases.filter((item) => item.id !== card.id);
  return { ...catalog, bases: [...remainingCards, card] };
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
async function lastDestCategory(dataRoot, baseId) {
  const catalog = await readCatalog(dataRoot);
  return catalog.bases.find((card) => card.id === baseId)?.lastDestCategory;
}
async function rememberLastDest(dataRoot, baseId, destCategory) {
  const catalog = await readCatalog(dataRoot);
  const currentCard = catalog.bases.find((card) => card.id === baseId);
  if (!currentCard || currentCard.lastDestCategory === destCategory) return;
  currentCard.lastDestCategory = destCategory;
  await writeCatalog(dataRoot, catalog);
}
function cleanAliases(aliases) {
  if (!aliases) return [];
  const seen = /* @__PURE__ */ new Set();
  const cleanedAliases = [];
  for (const rawAlias of aliases) {
    const value = rawAlias.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    cleanedAliases.push(value);
  }
  return cleanedAliases;
}

// src/bases.ts
function requireNonEmptyText(value, field) {
  const text2 = value?.trim() ?? "";
  if (!text2) throw new KbError("missing_field", `${field} \u5FC5\u586B`);
  return text2;
}
async function directoryExists(directoryPath) {
  try {
    return (await stat(directoryPath)).isDirectory();
  } catch {
    return false;
  }
}
async function scanBaseIds(dataRoot) {
  const basesDirectory = basesRoot(dataRoot);
  if (!await directoryExists(basesDirectory)) return [];
  const entries = await readdir(basesDirectory, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name);
}
async function walkTextDocuments(directoryPath) {
  const documentPaths = [];
  let entries;
  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch {
    return documentPaths;
  }
  for (const entry of entries) {
    const entryPath = join3(directoryPath, entry.name);
    if (entry.isDirectory()) documentPaths.push(...await walkTextDocuments(entryPath));
    else if (TEXT_EXTS.has(extensionOf(entry.name))) documentPaths.push(entryPath);
  }
  return documentPaths;
}
function extensionOf(name2) {
  const index = name2.lastIndexOf(".");
  return index >= 0 ? name2.slice(index).toLowerCase() : "";
}
async function countDocs(dataRoot, baseId) {
  return (await walkTextDocuments(baseDir(dataRoot, baseId))).length;
}
async function listBaseCategories(dataRoot, baseId) {
  const baseDirectory = baseDir(dataRoot, baseId);
  if (!await directoryExists(baseDirectory)) return [];
  const entries = await readdir(baseDirectory, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name);
}
function createBaseCardFromDirectory(id) {
  return { id, title: id, description: "", aliases: [], createdAt: 0, lastUsedAt: 0 };
}
async function listBases(dataRoot) {
  const catalog = await readCatalog(dataRoot);
  const onDiskBaseIds = await scanBaseIds(dataRoot);
  const cardsById = new Map(catalog.bases.map((card) => [card.id, card]));
  const baseIds = [.../* @__PURE__ */ new Set([...onDiskBaseIds, ...catalog.bases.map((card) => card.id)])];
  const summaries = [];
  for (const id of baseIds.sort()) {
    const card = cardsById.get(id) ?? createBaseCardFromDirectory(id);
    summaries.push({
      ...card,
      categories: await listBaseCategories(dataRoot, id),
      approxDocs: await countDocs(dataRoot, id),
      lastUsed: catalog.lastUsedBaseId === id
    });
  }
  return summaries;
}
async function hasBaseTitle(dataRoot, catalog, title, excludeId) {
  if (catalog.bases.some((card) => card.id !== excludeId && card.title === title)) return true;
  const catalogIds = new Set(catalog.bases.map((card) => card.id));
  return (await scanBaseIds(dataRoot)).some((id) => id !== excludeId && !catalogIds.has(id) && id.trim() === title);
}
async function generateBaseId(dataRoot, catalog) {
  const existingIds = /* @__PURE__ */ new Set([...catalog.bases.map((card) => card.id), ...await scanBaseIds(dataRoot)]);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = randomUUID();
    if (!existingIds.has(id)) return id;
  }
  throw new KbError("base_exists", "\u65E0\u6CD5\u751F\u6210\u552F\u4E00\u77E5\u8BC6\u5E93 ID\uFF0C\u8BF7\u91CD\u8BD5");
}
async function createBase(dataRoot, input) {
  const title = requireNonEmptyText(input.title, "title");
  const description = requireNonEmptyText(input.description, "description");
  const catalog = await readCatalog(dataRoot);
  if (await hasBaseTitle(dataRoot, catalog, title)) {
    throw new KbError("title_exists", `\u77E5\u8BC6\u5E93\u6807\u9898\u300C${title}\u300D\u5DF2\u5B58\u5728`);
  }
  const id = await generateBaseId(dataRoot, catalog);
  const now = Date.now();
  const card = { id, title, description, aliases: cleanAliases(input.aliases), createdAt: now, lastUsedAt: now };
  await mkdir2(baseDir(dataRoot, id), { recursive: true });
  const nextCatalog = upsertBase(catalog, card);
  if (!nextCatalog.lastUsedBaseId) nextCatalog.lastUsedBaseId = id;
  if (!nextCatalog.prefs.defaultBaseId) nextCatalog.prefs.defaultBaseId = id;
  await writeCatalog(dataRoot, nextCatalog);
  return card;
}
async function updateBase(dataRoot, id, patch) {
  const catalog = await readCatalog(dataRoot);
  const currentCard = catalog.bases.find((card2) => card2.id === id);
  if (!currentCard) throw new KbError("base_missing", `\u77E5\u8BC6\u5E93 ${id} \u4E0D\u5B58\u5728\uFF0C\u8BF7\u5148\u5EFA\u5E93`);
  const title = patch.title !== void 0 ? requireNonEmptyText(patch.title, "title") : currentCard.title;
  if (await hasBaseTitle(dataRoot, catalog, title, id)) {
    throw new KbError("title_exists", `\u77E5\u8BC6\u5E93\u6807\u9898\u300C${title}\u300D\u5DF2\u5B58\u5728`);
  }
  const card = {
    ...currentCard,
    title,
    description: patch.description !== void 0 ? requireNonEmptyText(patch.description, "description") : currentCard.description,
    aliases: patch.aliases !== void 0 ? cleanAliases(patch.aliases) : currentCard.aliases
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
  const currentCard = catalog.bases.find((card) => card.id === id);
  if (!currentCard) return;
  currentCard.lastUsedAt = Date.now();
  catalog.lastUsedBaseId = id;
  await writeCatalog(dataRoot, catalog);
}
async function requireBase(dataRoot, id) {
  const catalog = await readCatalog(dataRoot);
  if (catalog.bases.some((card) => card.id === id) || await directoryExists(baseDir(dataRoot, id))) return;
  throw new KbError("base_missing", `\u77E5\u8BC6\u5E93 ${id} \u4E0D\u5B58\u5728\uFF0C\u8BF7\u5148\u5EFA\u5E93`);
}
async function walkTree(baseRoot, directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const nodes = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "zh"))) {
    const absolutePath = join3(directoryPath, entry.name);
    const relativePath = relative2(baseRoot, absolutePath).split(sep2).join("/");
    if (entry.isDirectory()) {
      nodes.push({ name: entry.name, kind: "dir", path: relativePath, children: await walkTree(baseRoot, absolutePath) });
      continue;
    }
    if (!TEXT_EXTS.has(extensionOf(entry.name))) continue;
    const info = await stat(absolutePath);
    nodes.push({ name: entry.name, kind: "file", path: relativePath, size: info.size, mtime: info.mtimeMs });
  }
  return nodes;
}
async function listTree(dataRoot, baseId) {
  await requireBase(dataRoot, baseId);
  const baseRoot = baseDir(dataRoot, baseId);
  if (!await directoryExists(baseRoot)) return [];
  return walkTree(baseRoot, baseRoot);
}
async function readEntry(dataRoot, baseId, relativePath) {
  await requireBase(dataRoot, baseId);
  const absolutePath = resolveDest(dataRoot, baseId, relativePath).absolute;
  assertNoSymlinkEscape(baseDir(dataRoot, baseId), absolutePath);
  try {
    return { path: relativePath, text: await readFile2(absolutePath, "utf8") };
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new KbError("not_found", `\u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${relativePath}`);
    }
    throw error;
  }
}
async function writeEntry(dataRoot, baseId, relativePath, text2) {
  await requireBase(dataRoot, baseId);
  const absolutePath = resolveDest(dataRoot, baseId, relativePath).absolute;
  assertInside(baseDir(dataRoot, baseId), absolutePath);
  await mkdir2(dirname2(absolutePath), { recursive: true });
  await writeFile2(absolutePath, text2, "utf8");
}
async function deleteEntry(dataRoot, baseId, relativePath, confirm) {
  if (!confirm) throw new KbError("confirm_required", "\u5220\u9664\u6587\u4EF6\u6216\u7C7B\u76EE\u9700\u8981\u786E\u8BA4");
  await requireBase(dataRoot, baseId);
  const absolutePath = resolveDest(dataRoot, baseId, relativePath).absolute;
  assertInside(baseDir(dataRoot, baseId), absolutePath);
  assertNoSymlinkEscape(baseDir(dataRoot, baseId), absolutePath);
  await rm(absolutePath, { recursive: true, force: true });
}

// src/ingest.ts
import { createHash } from "node:crypto";
import { createReadStream, existsSync as existsSync3 } from "node:fs";
import { copyFile, mkdir as mkdir3, readdir as readdir2, stat as stat2 } from "node:fs/promises";
import { basename, dirname as dirname3, extname, isAbsolute as isAbsolute2, join as join4, relative as relative3, sep as sep3 } from "node:path";
function extensionOf2(name2) {
  return extname(name2).toLowerCase();
}
function isTextFile(name2) {
  return TEXT_EXTS.has(extensionOf2(name2));
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
    const entryPath = join4(source, entry.name);
    if (entry.isDirectory()) files.push(...await walkSource(entryPath));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}
async function existingHashes(baseRoot) {
  const map = /* @__PURE__ */ new Map();
  const files = await walkSource(baseRoot).catch(() => []);
  for (const file of files) {
    if (!isTextFile(file)) continue;
    map.set(await sha256File(file), relative3(baseRoot, file).split(sep3).join("/"));
  }
  return map;
}
async function dirSize(baseRoot) {
  let total = 0;
  const files = await walkSource(baseRoot).catch(() => []);
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
function looksBareName(sourcePath) {
  const value = sourcePath.trim();
  return Boolean(value) && !value.includes("/") && !value.includes("\\") && !value.startsWith("~") && !isAbsolute2(value);
}
function missingSourceMessage(sourcePath) {
  if (looksBareName(sourcePath)) {
    return `\u6E90\u8DEF\u5F84\u4E0D\u5B58\u5728\uFF1A${sourcePath}\u3002\u6D4F\u89C8\u5668\u53EA\u7ED9\u51FA\u4E86\u6587\u4EF6\u540D\uFF0C\u8BF7\u4F7F\u7528\u5BFC\u5165\u5F39\u6846\u4E2D\u7684\u62D6\u62FD\u533A\u57DF\uFF0C\u6216\u70B9\u51FB\u9009\u62E9\u6309\u94AE\u6253\u5F00\u7CFB\u7EDF\u5BF9\u8BDD\u6846`;
  }
  return `\u6E90\u8DEF\u5F84\u4E0D\u5B58\u5728\uFF1A${sourcePath}`;
}
function relativeSourcePath(sourceRoot, file, preserveTree) {
  if (!preserveTree) return basename(file);
  return relative3(sourceRoot, file).split(sep3).join("/");
}
async function ingest(dataRoot, input) {
  await requireBase(dataRoot, input.baseId);
  const catalog = await readCatalog(dataRoot);
  const source = expandUserPath(input.sourcePath);
  if (!existsSync3(source)) throw new KbError("not_found", missingSourceMessage(input.sourcePath));
  const destination = resolveDest(dataRoot, input.baseId, input.destCategory);
  const baseRoot = baseDir(dataRoot, input.baseId);
  assertInside(baseRoot, destination.absolute);
  const createMissing = input.createMissing !== false;
  const preserveTree = Boolean(input.preserveTree);
  if (createMissing) await mkdir3(destination.absolute, { recursive: true });
  else if (!existsSync3(destination.absolute)) {
    throw new KbError("not_found", `\u7C7B\u76EE\u4E0D\u5B58\u5728\uFF1A${destination.relative || "(\u5E93\u6839)"}`);
  }
  const hashes = await existingHashes(baseRoot);
  const currentBytes = await dirSize(baseRoot);
  const createdDirs = /* @__PURE__ */ new Set();
  if (createMissing && destination.relative) createdDirs.add(destination.relative);
  const sourceInfo = await stat2(source);
  const sourceRoot = sourceInfo.isDirectory() ? source : dirname3(source);
  const files = await walkSource(source);
  const result = {
    baseId: input.baseId,
    copied: [],
    renamed: [],
    skipped: 0,
    failed: 0,
    createdDirs: [],
    files: [],
    warnings: destination.deep ? [`\u7C7B\u76EE\u6DF1\u5EA6\u8D85\u8FC7 ${CATEGORY_WARN_DEPTH}\uFF0C\u4ECD\u5DF2\u5199\u5165`] : []
  };
  let addedBytes = 0;
  for (const file of files) {
    const fileResult = await ingestOne({
      file,
      sourceRoot,
      destinationAbsolute: destination.absolute,
      preserveTree,
      baseRoot,
      hashes,
      maxFileBytes: catalog.prefs.maxFileBytes,
      maxBaseBytes: catalog.prefs.maxBaseBytes,
      currentBytes: currentBytes + addedBytes
    });
    result.files.push(fileResult);
    if (fileResult.status === "skipped") result.skipped += 1;
    else if (fileResult.status === "failed") result.failed += 1;
    else {
      result.copied.push(fileResult.relPath);
      if (fileResult.status === "renamed") result.renamed.push(fileResult.relPath);
      if (fileResult.relPath.includes("/")) createdDirs.add(dirname3(fileResult.relPath).split(sep3).join("/"));
      addedBytes += (await stat2(join4(baseRoot, fileResult.relPath))).size;
    }
  }
  result.createdDirs = [...createdDirs].filter(Boolean);
  await rememberLastDest(dataRoot, input.baseId, destination.relative);
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
  const sourceRelativePath = relativeSourcePath(args.sourceRoot, args.file, args.preserveTree);
  const intendedPath = join4(args.destinationAbsolute, sourceRelativePath);
  assertInside(args.baseRoot, intendedPath);
  assertNoSymlinkEscape(args.baseRoot, dirname3(intendedPath));
  await mkdir3(dirname3(intendedPath), { recursive: true });
  let destinationPath = intendedPath;
  let status = "copied";
  if (existsSync3(destinationPath)) {
    destinationPath = join4(dirname3(intendedPath), uniqueName(dirname3(intendedPath), basename(intendedPath)));
    status = "renamed";
  }
  await copyFile(args.file, destinationPath);
  const relativeDestinationPath = relative3(args.baseRoot, destinationPath).split(sep3).join("/");
  args.hashes.set(digest, relativeDestinationPath);
  return { relPath: relativeDestinationPath, status };
}

// src/pick-source.ts
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
var defaultExec = (file, args) => promisify(execFileCb)(file, args, { windowsHide: true, encoding: "utf8" });
function normalizePickedPath(raw) {
  let path = raw.replace(/\r?\n$/g, "").trim();
  const isWindowsDriveRoot = /^[A-Za-z]:[\\/]$/.test(path);
  if (path.length > 1 && !isWindowsDriveRoot && (path.endsWith("/") || path.endsWith("\\"))) path = path.slice(0, -1);
  return path;
}
function macArgs(kind) {
  const prompt = kind === "dir" ? "\u9009\u62E9\u8981\u5BFC\u5165\u7684\u6587\u4EF6\u5939" : "\u9009\u62E9\u8981\u5BFC\u5165\u7684\u6587\u4EF6";
  const choose = kind === "dir" ? "choose folder" : "choose file";
  return ["-e", `try
POSIX path of (${choose} with prompt "${prompt}")
on error number -128
""
end try`];
}
function winArgs(kind) {
  const utf8 = "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ";
  const script = kind === "dir" ? `${utf8}Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = '\u9009\u62E9\u8981\u5BFC\u5165\u7684\u6587\u4EF6\u5939'; if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $d.SelectedPath }` : `${utf8}Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.OpenFileDialog; $d.Filter = 'Markdown/Text|*.md;*.txt;*.markdown|All|*.*'; $d.Title = '\u9009\u62E9\u8981\u5BFC\u5165\u7684\u6587\u4EF6'; if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $d.FileName }`;
  return ["-NoProfile", "-STA", "-Command", script];
}
function linuxArgs(kind) {
  return kind === "dir" ? ["--file-selection", "--directory", "--title=\u9009\u62E9\u8981\u5BFC\u5165\u7684\u6587\u4EF6\u5939"] : ["--file-selection", "--title=\u9009\u62E9\u8981\u5BFC\u5165\u7684\u6587\u4EF6"];
}
function invokeArgs(kind, platform) {
  if (platform === "darwin") return { file: "osascript", args: macArgs(kind) };
  if (platform === "win32") return { file: "powershell.exe", args: winArgs(kind) };
  if (platform === "linux") return { file: "zenity", args: linuxArgs(kind) };
  throw new KbError("not_found", `\u5F53\u524D\u5E73\u53F0 ${platform} \u6682\u4E0D\u652F\u6301\u7CFB\u7EDF\u6587\u4EF6\u9009\u62E9\u5668\uFF0C\u8BF7\u4F7F\u7528\u62D6\u62FD\u5BFC\u5165`);
}
function isMissingBin(error) {
  return Boolean(error && typeof error === "object" && error.code === "ENOENT");
}
function isCancelExit(error) {
  const code = error && typeof error === "object" ? error.code : void 0;
  return code === 1 || code === 128;
}
async function pickSource(kind, opts) {
  const exec = opts?.exec ?? defaultExec;
  const platform = opts?.platform ?? process.platform;
  const { file, args } = invokeArgs(kind, platform);
  try {
    const { stdout } = await exec(file, args);
    const path = normalizePickedPath(stdout);
    if (!path) return { cancelled: true };
    return { path };
  } catch (error) {
    if (isMissingBin(error)) {
      throw new KbError("not_found", "\u672C\u673A\u6CA1\u6709\u53EF\u7528\u7684\u9009\u6587\u4EF6\u5BF9\u8BDD\u6846\uFF0C\u8BF7\u4F7F\u7528\u62D6\u62FD\u533A\u57DF\uFF0C\u6216\u68C0\u67E5\u7CFB\u7EDF\u6587\u4EF6\u9009\u62E9\u5668");
    }
    if (isCancelExit(error)) return { cancelled: true };
    throw error instanceof Error ? error : new Error(String(error));
  }
}

// src/search.ts
import { spawn } from "node:child_process";
import { existsSync as existsSync4 } from "node:fs";
import { readFile as readFile3 } from "node:fs/promises";
import { isAbsolute as isAbsolute3, join as join5, relative as relative4, sep as sep4 } from "node:path";
function mergeTerms(query, aliases) {
  const warnings = [];
  let aliasList = (aliases ?? []).map((item) => item.trim()).filter(Boolean);
  if (aliasList.length > MAX_ALIASES) {
    warnings.push(`aliases \u8D85\u8FC7 ${MAX_ALIASES} \u4E2A\uFF0C\u5DF2\u622A\u65AD`);
    aliasList = aliasList.slice(0, MAX_ALIASES);
  }
  const seen = /* @__PURE__ */ new Set();
  const terms = [];
  for (const term of [query.trim(), ...aliasList]) {
    if (!term || seen.has(term)) continue;
    seen.add(term);
    terms.push(term);
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
    const lineMatch = raw.match(/^(.*?):(\d+):(.*)$/);
    const contextMatch = raw.match(/^(.*?)-(\d+)-(.*)$/);
    const match = lineMatch ?? contextMatch;
    if (!match) continue;
    const printedPath = match[1];
    const absolutePath = isAbsolute3(printedPath) ? printedPath : join5(rootDir, printedPath);
    const relativePath = relative4(rootDir, absolutePath).split(sep4).join("/");
    currentPath = relativePath || currentPath;
    if (lineMatch) matches.push({ path: currentPath || relativePath, line: Number(lineMatch[2]), text: lineMatch[3] });
  }
  return matches;
}
function clipAround(lines, center, radius) {
  const start = Math.max(1, center - radius);
  const end = Math.min(lines.length, center + radius);
  return { start, end, excerpt: lines.slice(start - 1, end).join("\n") };
}
function mergeExcerpts(first, second, startLine, endLine) {
  const firstLines = first.excerpt.split(/\r?\n/);
  const secondLines = second.excerpt.split(/\r?\n/);
  const mergedLines = [];
  for (let line = startLine; line <= endLine; line += 1) {
    if (line >= second.startLine && line <= second.endLine) {
      mergedLines.push(secondLines[line - second.startLine] ?? "");
    } else if (line >= first.startLine && line <= first.endLine) {
      mergedLines.push(firstLines[line - first.startLine] ?? "");
    } else {
      mergedLines.push("");
    }
  }
  return mergedLines.join("\n");
}
function mergeAdjacent(hits) {
  const sorted = [...hits].sort((a, b) => a.file.localeCompare(b.file) || a.startLine - b.startLine);
  const mergedHits = [];
  for (const hit of sorted) {
    const previousHit = mergedHits.at(-1);
    if (previousHit && previousHit.file === hit.file && hit.startLine <= previousHit.endLine + 1) {
      const startLine = Math.min(previousHit.startLine, hit.startLine);
      const endLine = Math.max(previousHit.endLine, hit.endLine);
      previousHit.excerpt = mergeExcerpts(previousHit, hit, startLine, endLine);
      previousHit.startLine = startLine;
      previousHit.endLine = endLine;
      previousHit.matchLine = Math.min(previousHit.matchLine, hit.matchLine);
      continue;
    }
    mergedHits.push({ ...hit });
  }
  return mergedHits;
}
function diversify(hits, topK) {
  const fileHitCounts = /* @__PURE__ */ new Map();
  const selectedHits = [];
  const remainingHits = [...hits];
  while (selectedHits.length < topK && remainingHits.length) {
    remainingHits.sort((a, b) => (fileHitCounts.get(a.file) ?? 0) - (fileHitCounts.get(b.file) ?? 0));
    const nextHit = remainingHits.shift();
    if (!nextHit) break;
    fileHitCounts.set(nextHit.file, (fileHitCounts.get(nextHit.file) ?? 0) + 1);
    selectedHits.push(nextHit);
  }
  return selectedHits.map((hit, index) => ({
    n: index + 1,
    path: hit.path,
    startLine: hit.startLine,
    endLine: hit.endLine,
    matchLine: hit.matchLine,
    excerpt: hit.excerpt
  }));
}
async function resolveRg() {
  const mod = await import("@vscode/ripgrep");
  const ripgrepPath = mod.rgPath;
  if (!ripgrepPath || !existsSync4(ripgrepPath)) throw new Error("\u627E\u4E0D\u5230\u6253\u5305\u7684 ripgrep");
  return ripgrepPath;
}
function runRg(binaryPath, rgArgs, workingDirectory) {
  return new Promise((resolve2, reject) => {
    const child = spawn(binaryPath, rgArgs, { cwd: workingDirectory, windowsHide: true });
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
    const ripgrepBinary = await resolveRg();
    const rgArgs = ["-n", "-C", String(SEARCH_CONTEXT), "--glob", "*.md", "--glob", "*.txt", "--glob", "*.markdown"];
    for (const term of input.terms) rgArgs.push("-e", term);
    rgArgs.push(".");
    const stdout = await runRg(ripgrepBinary, rgArgs, input.rootDir);
    const matches = parseRg(stdout, input.rootDir);
    const rawHits = [];
    for (const match of matches) {
      const absolutePath = join5(input.rootDir, match.path);
      const lines = existsSync4(absolutePath) ? (await readFile3(absolutePath, "utf8")).split(/\r?\n/) : [match.text];
      const clip = clipAround(lines, match.line, SEARCH_CONTEXT);
      rawHits.push({
        n: 0,
        file: match.path,
        path: match.path,
        startLine: clip.start,
        endLine: clip.end,
        matchLine: match.line,
        excerpt: clip.excerpt
      });
    }
    return diversify(mergeAdjacent(rawHits), input.topK);
  }
};
async function readSearchDocuments(rootDir, hits) {
  const documents = [];
  const seen = /* @__PURE__ */ new Set();
  for (const hit of hits) {
    if (seen.has(hit.path)) continue;
    seen.add(hit.path);
    const absolutePath = assertInside(rootDir, join5(rootDir, hit.path));
    assertNoSymlinkEscape(rootDir, absolutePath);
    try {
      documents.push({ path: hit.path, text: await readFile3(absolutePath, "utf8") });
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
  }
  return documents;
}
async function searchBase(dataRoot, input, engine = new RipgrepSearchEngine()) {
  if (!input.baseId?.trim()) throw new KbError("missing_field", "kb_search \u5FC5\u987B\u5E26 baseId");
  if (!input.query?.trim()) throw new KbError("missing_field", "query \u5FC5\u586B");
  await requireBase(dataRoot, input.baseId);
  const { terms, warnings } = mergeTerms(input.query, input.aliases);
  const topK = Math.min(MAX_TOP_K, Math.max(1, input.topK ?? DEFAULT_TOP_K));
  let rootDir = baseDir(dataRoot, input.baseId);
  if (input.category?.trim()) {
    try {
      const destination = resolveDest(dataRoot, input.baseId, input.category);
      if (existsSync4(destination.absolute)) rootDir = destination.absolute;
    } catch {
    }
  }
  const hits = await engine.search({ baseId: input.baseId, rootDir, terms, topK });
  const documents = await readSearchDocuments(rootDir, hits);
  await markUsed(dataRoot, input.baseId);
  return { hits, warnings, documents };
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
  const tokens = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let tokenMatch;
  while (tokenMatch = re.exec(rawInput)) tokens.push(tokenMatch[1] ?? tokenMatch[2] ?? tokenMatch[3]);
  return tokens;
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
  const dataRoot = await resolveDataRoot();
  switch (op) {
    case "list":
      return listBases(dataRoot);
    case "create":
      return createBase(dataRoot, {
        title: String(data.title ?? ""),
        description: String(data.description ?? ""),
        aliases: Array.isArray(data.aliases) ? data.aliases.map(String) : []
      });
    case "update":
      return updateBase(dataRoot, String(data.id ?? ""), {
        title: data.title,
        description: data.description,
        aliases: Array.isArray(data.aliases) ? data.aliases.map(String) : void 0
      });
    case "deleteBase":
      await deleteBase(dataRoot, String(data.id ?? ""), Boolean(data.confirm));
      return { ok: true };
    case "tree":
      return listTree(dataRoot, String(data.id ?? ""));
    case "read":
      return readEntry(dataRoot, String(data.id ?? ""), String(data.path ?? ""));
    case "write":
      await writeEntry(dataRoot, String(data.id ?? ""), String(data.path ?? ""), String(data.text ?? ""));
      return { ok: true };
    case "deleteEntry":
      await deleteEntry(dataRoot, String(data.id ?? ""), String(data.path ?? ""), Boolean(data.confirm));
      return { ok: true };
    case "pick":
      return pickSource(data.kind === "dir" ? "dir" : "file");
    case "ingest":
      return jobs.enqueue("ingest", () => ingest(dataRoot, {
        baseId: String(data.baseId ?? ""),
        sourcePath: String(data.sourcePath ?? ""),
        destCategory: String(data.destCategory ?? ""),
        preserveTree: Boolean(data.preserveTree),
        createMissing: data.createMissing !== false
      }));
    case "search":
      return searchBase(dataRoot, {
        baseId: String(data.baseId ?? ""),
        query: String(data.query ?? ""),
        aliases: Array.isArray(data.aliases) ? data.aliases.map(String) : void 0,
        category: typeof data.category === "string" ? data.category : void 0,
        topK: typeof data.topK === "number" ? data.topK : void 0
      });
    case "prefs":
      return (await readCatalog(dataRoot)).prefs;
    case "setPrefs": {
      const catalog = await readCatalog(dataRoot);
      if (typeof data.defaultBaseId === "string") catalog.prefs.defaultBaseId = data.defaultBaseId;
      if (typeof data.maxFileBytes === "number") catalog.prefs.maxFileBytes = data.maxFileBytes;
      if (typeof data.maxBaseBytes === "number") catalog.prefs.maxBaseBytes = data.maxBaseBytes;
      await writeCatalog(dataRoot, catalog);
      return catalog.prefs;
    }
    default:
      throw new KbError("missing_field", `\u672A\u77E5\u64CD\u4F5C ${op}`);
  }
}
async function resolveIngestTo(dataRoot, baseId, destinationCategoryFlag, importToBaseRoot) {
  if (destinationCategoryFlag !== void 0) return destinationCategoryFlag;
  if (importToBaseRoot) return "";
  const lastDestinationCategory = await lastDestCategory(dataRoot, baseId);
  if (lastDestinationCategory === void 0) {
    throw new KbError("missing_field", "\u8BF7\u6307\u5B9A --to <\u7C7B\u76EE>\uFF0C\u6216 --root \u5BFC\u5165\u5230\u5E93\u6839");
  }
  return lastDestinationCategory;
}
async function handleIngest(rest, flags, jobs) {
  const sourcePath = rest[0] ?? flagString(flags, "path");
  const baseId = flagString(flags, "base");
  if (!sourcePath) throw new KbError("missing_field", "\u7528\u6CD5\uFF1A/kb ingest <path> --base <id> --to <\u7C7B\u76EE>");
  if (!baseId) throw new KbError("missing_field", "\u5BFC\u5165\u5FC5\u987B\u6307\u5B9A --base");
  const dataRoot = await resolveDataRoot();
  const destCategory = await resolveIngestTo(dataRoot, baseId, flagString(flags, "to"), flagBool(flags, "root", false));
  return jobs.enqueue("ingest", () => ingest(dataRoot, {
    baseId,
    sourcePath,
    destCategory,
    preserveTree: flagBool(flags, "preserve-tree"),
    createMissing: !flagBool(flags, "no-create")
  }));
}
function registerKbCommands(ctx, jobs) {
  return ctx.commands.register({
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
          const dataRoot = await resolveDataRoot();
          return ok(await searchBase(dataRoot, {
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
  }) ?? (() => void 0);
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
function renderSearchResult(value) {
  const result = value;
  const hits = Array.isArray(result?.hits) ? result.hits : [];
  const warnings = Array.isArray(result?.warnings) ? result.warnings.filter((item) => typeof item === "string" && item.trim()) : [];
  const renderedHits = hits.map((hit) => {
    const lineRange = hit.startLine === hit.endLine ? `${hit.startLine}` : `${hit.startLine}\u2013${hit.endLine}`;
    return `\`${hit.n}\` ${hit.path}:${lineRange}\uFF08\u547D\u4E2D\u884C ${hit.matchLine}\uFF09
${hit.excerpt}`;
  });
  const body = renderedHits.length ? renderedHits.join("\n\n") : "\u65E0\u547D\u4E2D";
  return text(warnings.length ? `${body}

\u63D0\u793A\uFF1A${warnings.join("\uFF1B")}` : body);
}
function fail2(error) {
  if (error instanceof KbError) throw new Error(error.message);
  throw error;
}
function registerKbTools(ctx, jobs = createJobRunner()) {
  const offs = [
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
    }),
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
          createMissing: { type: "boolean", description: "\u7C7B\u76EE\u4E0D\u5B58\u5728\u5219\u521B\u5EFA\uFF0C\u9ED8\u8BA4 true\u3002\u4E0D\u5EFA\u65B0\u5E93" },
          onConflict: { type: "string", enum: ["skip"], description: "\u9ED8\u8BA4 skip\u3002\u540C\u6307\u7EB9\u8DF3\u8FC7\uFF1B\u540C\u540D\u4E0D\u540C\u5185\u5BB9\u6539\u540D\uFF0C\u4E0D\u8986\u76D6" }
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
        const input = asRecord(args);
        try {
          const dataRoot = await resolveDataRoot();
          return await jobs.enqueue("ingest", () => ingest(dataRoot, {
            baseId: requireString(input, "baseId"),
            sourcePath: requireString(input, "sourcePath"),
            destCategory: asString2(input.destCategory) ?? "",
            preserveTree: asBool(input.preserveTree, false),
            createMissing: asBool(input.createMissing, true),
            onConflict: "skip"
          }));
        } catch (error) {
          fail2(error);
        }
      }
    }),
    ctx.tools.register({
      name: "kb_search",
      description: "\u5728\u6307\u5B9A\u77E5\u8BC6\u5E93\u91CC\u4E00\u6B21\u591A\u8BCD grep\uFF0C\u8FD4\u56DE\u547D\u4E2D\u7684\u539F\u6587 excerpt\u3001\u6587\u4EF6\u8DEF\u5F84\u548C\u884C\u53F7\u3002\u5FC5\u987B\u5E26 baseId\u3002\u6362\u8BCD\u653E\u8FDB aliases\uFF083\uFF5E8\uFF09\u3002\u56DE\u7B54\u5FC5\u987B\u57FA\u4E8E excerpt\uFF1B\u6CA1\u547D\u4E2D\u8FD4\u56DE\u7A7A\u5217\u8868\uFF0C\u4E0D\u8981\u7F16\u9020\u3002",
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
        schema: {
          type: "object",
          required: ["hits", "warnings"],
          properties: {
            hits: {
              type: "array",
              items: {
                type: "object",
                required: ["n", "path", "startLine", "endLine", "matchLine", "excerpt"],
                properties: {
                  n: { type: "integer" },
                  path: { type: "string" },
                  startLine: { type: "integer" },
                  endLine: { type: "integer" },
                  matchLine: { type: "integer" },
                  excerpt: { type: "string" }
                }
              }
            },
            warnings: { type: "array", items: { type: "string" } },
            documents: {
              type: "array",
              items: {
                type: "object",
                required: ["path", "text"],
                properties: {
                  path: { type: "string" },
                  text: { type: "string" }
                }
              }
            }
          }
        },
        render: (_args, value) => renderSearchResult(value),
        presentationMeta: (args, value) => {
          const baseId = asString2(asRecord(args).baseId)?.trim();
          return baseId ? { ...asRecord(value), baseId } : value;
        }
      },
      presentCall: () => ({ card: "generic", title: "\u77E5\u8BC6\u5E93\u68C0\u7D22" }),
      presentResult: (_args, result) => result.isError ? { card: "generic", title: "\u68C0\u7D22\u5931\u8D25" } : { card: "generic", title: "\u77E5\u8BC6\u5E93\u547D\u4E2D" },
      execute: async (args) => {
        const input = asRecord(args);
        if (typeof input.baseId !== "string" || !input.baseId.trim()) {
          throw new Error("kb_search \u5FC5\u987B\u5E26 baseId");
        }
        try {
          const dataRoot = await resolveDataRoot();
          return await searchBase(dataRoot, {
            baseId: input.baseId,
            query: requireString(input, "query"),
            aliases: asStringArray(input.aliases),
            category: asString2(input.category),
            topK: typeof input.topK === "number" ? input.topK : void 0
          });
        } catch (error) {
          fail2(error);
        }
      }
    })
  ];
  return () => {
    for (const off of offs.reverse()) {
      if (typeof off === "function") off();
    }
  };
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
  "- \u547D\u4E2D\uFF1A\u5FC5\u987B\u57FA\u4E8E\u8FD4\u56DE\u7684 excerpt \u56DE\u7B54\uFF0C\u5E76\u5E26\u6587\u4EF6\u8DEF\u5F84\u3001\u884C\u53F7\u548C\u7247\u6BB5\u7F16\u53F7\uFF1B\u5F15\u7528\u7F16\u53F7\u4F7F\u7528 Markdown \u884C\u5185\u4EE3\u7801\u5305\u88F9\uFF0C\u4F8B\u5982\u547D\u4E2D\u4E86 `1` \u5904\uFF0C\u4E0D\u52A0\u65B9\u62EC\u53F7\uFF1B\u4E0D\u80FD\u53EA\u62A5\u8DEF\u5F84\u3002",
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
    "\u6CA1\u547D\u4E2D\u4E0D\u5F97\u8BF4\u300C\u6839\u636E\u77E5\u8BC6\u5E93\u300D\u3002\u547D\u4E2D\u65F6\u5FC5\u987B\u57FA\u4E8E\u8FD4\u56DE\u7684 excerpt \u56DE\u7B54\uFF0C\u5E26\u6587\u4EF6\u8DEF\u5F84\u3001\u884C\u53F7\u548C\u7247\u6BB5\u7F16\u53F7\uFF1B\u5F15\u7528\u7F16\u53F7\u4F7F\u7528 Markdown \u884C\u5185\u4EE3\u7801\u5305\u88F9\uFF0C\u4F8B\u5982\u547D\u4E2D\u4E86 `1` \u5904\uFF0C\u4E0D\u52A0\u65B9\u62EC\u53F7\uFF1B\u5F53\u524D\u9879\u76EE\u7684 grep / glob \u4E0D\u7B97\u77E5\u8BC6\u5E93\u68C0\u7D22\u3002"
  ].join("")
};
function registerZhiyuanSkill(ctx) {
  return ctx.skills?.register(ZHIYUAN_SKILL) ?? (() => void 0);
}
function registerZhiyuanPrompt(ctx) {
  return ctx.systemPrompt?.section(ZHIYUAN_PROMPT_SECTION) ?? (() => void 0);
}

// src/index.ts
var name = PACKAGE_NAME;
function apply(ctx) {
  const jobs = createJobRunner();
  const disposers = [];
  let alive = true;
  const track = (off) => {
    if (typeof off !== "function") return;
    if (!alive) {
      off();
      return;
    }
    disposers.push(off);
  };
  console.log("[zhiyuan] host loaded");
  ctx.logger?.info("[zhiyuan] host loaded");
  ctx.inject(["commands"], (scoped) => {
    track(registerKbCommands(scoped, jobs));
  });
  ctx.inject(["tools"], (scoped) => {
    track(registerKbTools(scoped, jobs));
  });
  ctx.inject(["skills"], (scoped) => {
    track(registerZhiyuanSkill(scoped));
  });
  ctx.inject(["systemPrompt"], (scoped) => {
    track(registerZhiyuanPrompt(scoped));
  });
  ctx.effect?.(() => {
    void resolveDataRoot().then((root) => ctx.logger?.info(`[zhiyuan] data root ${root}`));
    return () => {
      alive = false;
      for (const off of disposers.splice(0).reverse()) off();
      clearDataRootCache();
      console.log("[zhiyuan] host unloaded");
    };
  });
}
export {
  apply,
  name
};
