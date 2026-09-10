/** Host 任务队列的只读状态投影。 */
export type JobStatusResponse = {
  running: boolean
  op?: string
  failed: Array<{ op: string; message: string; at: number }>
}
