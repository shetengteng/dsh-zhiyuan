import { KbError } from '../../model/error/kb-error.ts'
import type { UpdatePreferencesRequest } from '../../model/request/preferences-request.ts'
import type { CatalogPrefs } from '../../model/value/catalog-prefs.ts'
import { kbDir } from '../../platform/paths.ts'
import type { CatalogRepository } from '../../repository/kb/catalog-repository.ts'
import { directoryExists } from './kb-lifecycle.ts'

const MAX_PREF_FILE_BYTES = 1024 * 1024 * 1024
const MAX_PREF_KB_BYTES = 10 * 1024 * 1024 * 1024 * 1024

/** 读取当前 catalog 持久化的偏好投影。 */
export async function getPreferences(catalogRepository: CatalogRepository, dataRoot: string): Promise<CatalogPrefs> {
  return (await catalogRepository.read(dataRoot)).prefs
}

/** 在 catalog 单写者事务中更新偏好，并保留既有额度与默认库校验。 */
export async function updatePreferences(
  catalogRepository: CatalogRepository,
  dataRoot: string,
  patch: UpdatePreferencesRequest,
): Promise<CatalogPrefs> {
  return catalogRepository.withTransaction(dataRoot, async ({ catalog }) => {
    const nextPrefs = {
      defaultKbId: patch.defaultKbId ?? catalog.prefs.defaultKbId,
      maxFileBytes: patch.maxFileBytes ?? catalog.prefs.maxFileBytes,
      maxKbBytes: patch.maxKbBytes ?? catalog.prefs.maxKbBytes,
    }
    if (nextPrefs.maxFileBytes > MAX_PREF_FILE_BYTES || nextPrefs.maxKbBytes > MAX_PREF_KB_BYTES) {
      throw new KbError('quota', '偏好额度超出允许范围')
    }
    if (nextPrefs.maxFileBytes > nextPrefs.maxKbBytes) {
      throw new KbError('quota', '单文件上限不能大于单库上限')
    }
    if (nextPrefs.defaultKbId) {
      const hasCatalogKb = catalog.kbs.some((card) => card.id === nextPrefs.defaultKbId)
      const hasKbDirectory = await directoryExists(kbDir(dataRoot, nextPrefs.defaultKbId))
      if (!hasCatalogKb && !hasKbDirectory) {
        throw new KbError('kb_missing', `知识库 ${nextPrefs.defaultKbId} 不存在，请先建库`)
      }
    }
    catalog.prefs = nextPrefs
    return { result: catalog.prefs, catalog }
  })
}
