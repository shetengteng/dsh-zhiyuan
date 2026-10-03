/** CSV 导入、预览、补丁与表格编辑分页限制。 */
export const CSV_MAX_PHYSICAL_LINE_BYTES = 64 * 1024
export const CSV_MAX_IMPORT_BYTES = 20 * 1024 * 1024
export const CSV_PREVIEW_MAX_CHARS = 200_000
export const CSV_PREVIEW_MAX_BYTES = CSV_MAX_IMPORT_BYTES
export const CSV_PREVIEW_MAX_ROWS = 500
export const CSV_MAX_PATCH_CHANGES = 10_000

/** 表格编辑单页行数上限，超出视为非法分页请求。 */
export const TABLE_EDITOR_PAGE_SIZE = 200
