import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

function existingFile(...parts: string[]): string | undefined {
  const path = join(...parts)
  return existsSync(path) ? path : undefined
}

function dshModuleRoots(): string[] {
  const roots: string[] = []
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  roots.push(join(home, 'profiles', 'node_modules'))
  roots.push(join(home, 'node_modules'))
  const launcher = join(
    homedir(),
    'Library/Application Support/io.deepseek.DeepSeek.deepseek-harness-launcher/dsh',
  )
  if (existsSync(launcher)) {
    try {
      for (const name of readdirSync(launcher)) {
        roots.push(join(launcher, name, 'node_modules'))
      }
    } catch { /* ignore */ }
  }
  return roots
}

export function resolveDshPackage(pkg: string, file: string): string | undefined {
  for (const root of dshModuleRoots()) {
    const path = existingFile(root, pkg, file)
    if (path) return pathToFileURL(path).href
  }
  return undefined
}

export async function importDsh<T = unknown>(pkg: string, file: string): Promise<T | undefined> {
  const href = resolveDshPackage(pkg, file)
  if (!href) return undefined
  return (await import(href)) as T
}
