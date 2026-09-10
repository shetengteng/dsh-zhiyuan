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
  const tokens: string[] = []
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g
  let tokenMatch: RegExpExecArray | null
  while ((tokenMatch = re.exec(rawInput))) tokens.push(tokenMatch[1] ?? tokenMatch[2] ?? tokenMatch[3])
  return tokens
}
