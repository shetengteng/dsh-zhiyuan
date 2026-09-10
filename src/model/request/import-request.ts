/** 从本机路径导入内容的应用请求。 */
export type ImportFromPathRequest = {
  kbId: string
  sourcePath: string
  destCategory: string
  preserveTree?: boolean
  createMissing?: boolean
  onConflict?: 'skip'
}

/** 创建路径导入请求前所需的已校验字段。 */
export type ImportPathRequestInput = Omit<ImportFromPathRequest, 'onConflict'>

/** 统一补齐路径导入的应用默认值，供 command、tool 与 RPC 共用。 */
export function createImportFromPathRequest(input: ImportPathRequestInput): ImportFromPathRequest {
  return {
    kbId: input.kbId,
    sourcePath: input.sourcePath,
    destCategory: input.destCategory,
    preserveTree: input.preserveTree ?? false,
    createMissing: input.createMissing ?? true,
    onConflict: 'skip',
  }
}

/** 浏览器拖入字节后交给 Host 导入用例的内部请求。 */
export type ImportDroppedBytesRequest = {
  kbId: string
  destCategory: string
  fileName: string
  bytes: Uint8Array
  preserveTree?: boolean
  createMissing?: boolean
}

/** 导入用例的两种已校验应用请求。 */
export type ImportRequest = ImportFromPathRequest | ImportDroppedBytesRequest
