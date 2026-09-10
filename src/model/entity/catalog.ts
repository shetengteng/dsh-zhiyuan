import type { CatalogPrefs } from '../value/catalog-prefs.ts'

/** catalog.json 中具有稳定身份的知识库卡片。 */
export type KbCard = {
  id: string
  title: string
  description: string
  aliases: string[]
  createdAt: number
  lastUsedAt: number
  lastDestCategory?: string
}

/** catalog.json 的持久化聚合根。 */
export type Catalog = {
  version: 2
  lastUsedKbId: string
  prefs: CatalogPrefs
  kbs: KbCard[]
}
