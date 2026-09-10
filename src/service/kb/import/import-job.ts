import type { ImportRequest } from '../../model/request/import-request.ts'
import type { ImportResponse } from '../../model/response/import-response.ts'
import type { JobRunner } from '../../platform/jobs.ts'
import type { CatalogRepository } from '../../repository/kb/catalog-repository.ts'
import { importDroppedBytes } from './import-drop.ts'
import { importFiles } from './import.ts'

/** 在共享任务队列中执行路径或拖入字节导入，保持导入结果而非返回任务包装。 */
export function enqueueKnowledgeImport(
  catalogRepository: CatalogRepository,
  dataRoot: string,
  jobs: JobRunner,
  requestFactory: () => ImportRequest,
): Promise<ImportResponse> {
  return jobs.enqueue('import', () => {
    const request = requestFactory()
    return 'bytes' in request
      ? importDroppedBytes(catalogRepository, dataRoot, request)
      : importFiles(catalogRepository, dataRoot, request)
  })
}
