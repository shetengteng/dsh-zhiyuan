import { readFile, writeFile, mkdir, unlink, copyFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const lib = join(root, 'lib')

// Host 端运行时真正需要外部解析的依赖：
// - 原生二进制（esbuild、@vscode/ripgrep）无法内联，必须 external；
// - @deepseek-ai/* peer 依赖由 DSH 壳注入，同样必须 external。
// 其余纯 JS 依赖（如 papaparse、@tiptap/*）内联打进单文件，使 lib/index.js
// 自包含，link 安装后无需再单独安装依赖即可运行。
const external = [
  'esbuild',
  '@vscode/ripgrep',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-home-paths',
  '@deepseek-ai/dsh-settings',
  '@deepseek-ai/schemastery',
]

await mkdir(lib, { recursive: true })

const skillSource = join(root, 'skills/zhiyuan-kb/SKILL.md')
const skillOutput = join(lib, 'skills/zhiyuan-kb/SKILL.md')
await mkdir(dirname(skillOutput), { recursive: true })
await copyFile(skillSource, skillOutput)

await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  external,
  logLevel: 'info',
})

// DOCX 转换子进程独立产物：mammoth / turndown 只进这个 bundle，不进 lib/index.js。
// mammoth 内部会在 CJS 模块里动态 require node 内建模块，ESM 产物需要 createRequire 兜底。
await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/formats/docx/worker.ts'],
  outfile: 'lib/convert-docx-worker.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  banner: {
    js: "import { createRequire as __zyCreateRequire } from 'node:module';\nvar require = __zyCreateRequire(import.meta.url);",
  },
  logLevel: 'info',
})

// XLSX 转换子进程独立产物：@e965/xlsx 只进这个 bundle，不进 lib/index.js。
await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/formats/xlsx/worker.ts'],
  outfile: 'lib/convert-xlsx-worker.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  banner: {
    js: "import { createRequire as __zyCreateRequire } from 'node:module';\nvar require = __zyCreateRequire(import.meta.url);",
  },
  logLevel: 'info',
})

// PDF 转换子进程独立产物：unpdf（内含 PDF.js serverless 构建）只进这个 bundle，不进 lib/index.js。
await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/formats/pdf/worker.ts'],
  outfile: 'lib/convert-pdf-worker.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  banner: {
    js: "import { createRequire as __zyCreateRequire } from 'node:module';\nvar require = __zyCreateRequire(import.meta.url);",
  },
  logLevel: 'info',
})

// HTML 转换子进程独立产物：@joplin/turndown（含 domino 解析器）只进这个 bundle，不进 lib/index.js。
await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/formats/html/worker.ts'],
  outfile: 'lib/convert-html-worker.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  banner: {
    js: "import { createRequire as __zyCreateRequire } from 'node:module';\nvar require = __zyCreateRequire(import.meta.url);",
  },
  logLevel: 'info',
})

const innerPath = join(lib, '_client.cjs')
await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/view/index.ts'],
  outfile: 'lib/_client.cjs',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/dsh-client-ui-primitives'],
  logLevel: 'info',
})

const inner = await readFile(innerPath, 'utf8')
const wrapped = `window.__ModuleLoader__.load({
  id: 'dsh-zhiyuan',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
${inner}
    return module.exports;
  },
});
`
await writeFile(join(lib, 'client.js'), wrapped)
await unlink(innerPath).catch(() => undefined)
await esbuild.stop()

console.log('built lib/index.js and lib/client.js')
