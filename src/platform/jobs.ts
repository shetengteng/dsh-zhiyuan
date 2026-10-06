import type { ImportProgress } from '../model/response/import-response.ts'
import type { JobStatusResponse } from '../model/response/job-response.ts'

export type JobRunner = {
  /** work 收到 report 回调，可在执行中更新进度快照（仅导入等长任务使用）。 */
  enqueue<T>(op: string, work: (report: (progress: ImportProgress) => void) => Promise<T>): Promise<T>
  status(): JobStatusResponse
}

export function createJobRunner(): JobRunner {
  let chain = Promise.resolve()
  let running = false
  let currentOp: string | undefined
  let currentProgress: ImportProgress | undefined
  const failed: JobStatusResponse['failed'] = []

  return {
    enqueue(op, work) {
      const run = chain.then(async () => {
        running = true
        currentOp = op
        currentProgress = undefined
        try {
          return await work((progress) => { currentProgress = progress })
        } catch (error) {
          failed.push({
            op,
            message: error instanceof Error ? error.message : String(error),
            at: Date.now(),
          })
          if (failed.length > 20) failed.shift()
          throw error
        } finally {
          running = false
          currentOp = undefined
        }
      })
      chain = run.then(() => undefined, () => undefined)
      return run
    },
    status() {
      // 进度快照保留到下个任务开始，便于客户端最后一次轮询拿到完整结果。
      return { running, op: currentOp, failed: failed.slice(-20), progress: currentProgress }
    },
  }
}
