export type FlagMap = Record<string, string | boolean>

export type ParsedLine = {
  sub: string
  rest: string[]
  flags: FlagMap
}

export function parseFlags(tokens: string[]): ParsedLine {
  const rest: string[] = []
  const flags: FlagMap = {}
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    if (!token.startsWith('--')) {
      rest.push(token)
      continue
    }
    const key = token.slice(2)
    const next = tokens[i + 1]
    if (!next || next.startsWith('--')) {
      flags[key] = true
      continue
    }
    flags[key] = next
    i += 1
  }
  return { sub: rest[0] ?? '', rest: rest.slice(1), flags }
}

export function flagString(flags: FlagMap, key: string): string | undefined {
  const value = flags[key]
  return typeof value === 'string' ? value : undefined
}

export function flagBool(flags: FlagMap, key: string, fallback = false): boolean {
  const value = flags[key]
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  return fallback
}

export function splitAliases(value: string | undefined): string[] {
  if (!value) return []
  return value.split(/[,，]/).map((item) => item.trim()).filter(Boolean)
}

export function tokenize(rawInput: string): string[] {
  const out: string[] = []
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(rawInput))) out.push(m[1] ?? m[2] ?? m[3])
  return out
}
