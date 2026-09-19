/** 搜索输入、分页与扫描限制。 */
export const SEARCH_CONTEXT = 8
export const SEARCH_DEFAULT_LIMIT = 20
export const SEARCH_MAX_LIMIT = 100
export const SEARCH_MAX_PATTERN_LENGTH = 512
export const MAX_ALIASES = 8
export const SEARCH_MAX_PATTERN_TOTAL_LENGTH = 4096
export const SEARCH_UNSUPPORTED_PATTERN_MESSAGE = 'query 或 aliases 使用了 ripgrep 不支持的正则语法；请改用正向匹配或转义特殊字符'
export const SEARCH_CURSOR_MAX_LENGTH = 4096
/** 列表档命中半径：MD 命中行 ±2 行；CSV 命中记录 + 相邻记录数 */
export const SEARCH_LIST_CONTEXT = 2
/** 每页渲染字符预算（含组头，不含概览尾注） */
export const SEARCH_PAGE_MAX_CHARS = 4000
export const SEARCH_RG_MAX_COUNT_PER_FILE = 200
export const SEARCH_RG_MAX_FILESIZE = '20M'
export const SEARCH_RG_MAX_STDOUT_BYTES = 2 * 1024 * 1024
export const SEARCH_RG_TIMEOUT_MS = 20_000
