import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const lib = join(root, 'lib')

await mkdir(lib, { recursive: true })

await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  packages: 'external',
  logLevel: 'info',
})

const innerPath = join(lib, '_client.cjs')
await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/client/index.ts'],
  outfile: 'lib/_client.cjs',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', '@deepseek-ai/dsh-client-ui-primitives'],
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

console.log('built lib/index.js and lib/client.js')
