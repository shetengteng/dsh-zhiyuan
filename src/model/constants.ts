/** 包与运行时身份。正式名：知源 / dsh-zhiyuan。产品对象仍称知识库。 */
import packageJson from '../../package.json' with { type: 'json' }

export const PACKAGE_NAME = 'dsh-zhiyuan'
export const PACKAGE_VERSION = packageJson.version
export const VERSION_LABEL = `v${PACKAGE_VERSION}`
export const SECTION_LABEL = '知源'
export const FOOTER_ACTION_ID = 'zhiyuan'
export const FOOTER_ACTION_ORDER = 50
export const TARGET_DSH_VERSION = '0.1.2-rc.1'
export const DATA_DIR_NAME = 'dsh-zhiyuan'
export const COMMAND_NAME = 'kb'

/** 展示层标题附加版本，不写回知识库卡片的持久化 title。 */
export function formatKbDisplayTitle(title: string, fallback = ''): string {
  const displayTitle = title.trim() || fallback.trim() || '未命名知识库'
  return `${displayTitle} · ${SECTION_LABEL} ${VERSION_LABEL}`
}

export const DEFAULT_MAX_FILE_BYTES = 5_242_880
export const DEFAULT_MAX_KB_BYTES = 10_737_418_240
export const MAX_ALIASES = 8
export const SEARCH_CONTEXT = 8
export const SEARCH_DEFAULT_LIMIT = 20
export const SEARCH_MAX_LIMIT = 100
export const SEARCH_MAX_PATTERN_LENGTH = 512
export const SEARCH_MAX_PATTERN_TOTAL_LENGTH = 4096
export const SEARCH_UNSUPPORTED_PATTERN_MESSAGE = 'query 或 aliases 使用了 ripgrep 不支持的正则语法；请改用正向匹配或转义特殊字符'
export const SEARCH_CURSOR_MAX_LENGTH = 4096
/** 列表档命中半径：MD 命中行 ±2 行；CSV 命中记录 + 相邻记录数 */
export const SEARCH_LIST_CONTEXT = 2
/** 每页渲染字符预算（含组头，不含概览尾注） */
export const SEARCH_PAGE_MAX_CHARS = 4000
export const CSV_MAX_PHYSICAL_LINE_BYTES = 64 * 1024
export const CSV_MAX_IMPORT_BYTES = 20 * 1024 * 1024
export const CSV_PREVIEW_MAX_CHARS = 200_000
export const CSV_PREVIEW_MAX_BYTES = CSV_MAX_IMPORT_BYTES
export const CSV_PREVIEW_MAX_ROWS = 500
export const TABLE_EDITOR_PAGE_SIZE = 200
export const CSV_MAX_PATCH_CHANGES = 10_000
export const MARK_USED_THROTTLE_MS = 60_000
export const SEARCH_RG_MAX_COUNT_PER_FILE = 200
export const SEARCH_RG_MAX_FILESIZE = '20M'
export const SEARCH_RG_MAX_STDOUT_BYTES = 2 * 1024 * 1024
export const SEARCH_RG_TIMEOUT_MS = 20_000
export const CATEGORY_WARN_DEPTH = 4
