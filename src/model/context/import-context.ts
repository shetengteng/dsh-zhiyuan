/** 导入目的地解析后的 Host 私有路径上下文。 */
export type DestinationResolution = {
  relative: string
  absolute: string
  segments: string[]
  deep: boolean
}
