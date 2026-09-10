import type { KbCard, Catalog } from '../../model/entity/catalog.ts'

export function cleanAliases(aliases: string[] | undefined): string[] {
  if (!aliases) return []
  const seen = new Set<string>()
  const cleanedAliases: string[] = []
  for (const rawAlias of aliases) {
    const value = rawAlias.trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    cleanedAliases.push(value)
  }
  return cleanedAliases
}

export function upsertKb(catalog: Catalog, card: KbCard): Catalog {
  const remainingCards = catalog.kbs.filter((item) => item.id !== card.id)
  return { ...catalog, kbs: [...remainingCards, card] }
}

export function removeKb(catalog: Catalog, id: string): Catalog {
  return {
    ...catalog,
    kbs: catalog.kbs.filter((item) => item.id !== id),
    lastUsedKbId: catalog.lastUsedKbId === id ? '' : catalog.lastUsedKbId,
    prefs: {
      ...catalog.prefs,
      defaultKbId: catalog.prefs.defaultKbId === id ? '' : catalog.prefs.defaultKbId,
    },
  }
}
