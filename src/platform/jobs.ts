import type { JobStatusResponse } from '../model/response/job-response.ts'

export type JobRunner = {
  enqueue<T>(op: string, work: () => Promise<T>): Promise<T>
  status(): JobStatusResponse
}

export function createJobRunner(): JobRunner {
  let chain = Promise.resolve()
  let running = false
  let currentOp: string | undefined
  const failed: JobStatusResponse['failed'] = []

  return {
    enqueue(op, work) {
      const run = chain.then(async () => {
        running = true
        currentOp = op
        try {
          return await work()
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
      return { running, op: currentOp, failed: failed.slice(-20) }
    },
  }
}
