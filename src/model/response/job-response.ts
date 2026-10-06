import type { ImportProgress } from './import-response.ts'

/** Host 任务队列的只读状态投影；progress 只在长任务（导入）执行期间由任务上报。 */
export type JobStatusResponse = {
  running: boolean
  op?: string
  failed: Array<{ op: string; message: string; at: number }>
  progress?: ImportProgress
}
