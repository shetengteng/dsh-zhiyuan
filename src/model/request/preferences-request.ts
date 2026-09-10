import type { CatalogPrefs } from '../value/catalog-prefs.ts'

/** 更新知识库偏好的应用请求；缺省字段保留当前持久化值。 */
export type UpdatePreferencesRequest = Partial<CatalogPrefs>
