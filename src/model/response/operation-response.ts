/** 已确认完成副作用的 operation 返回值。外层 RPC envelope 另有自己的 ok。 */
export type OperationAckResponse = {
  ok: true
}

/** 系统文件选择器的可序列化返回值。 */
export type PickSourceResponse =
  | { path: string }
  | { cancelled: true }
