/** 包与运行时身份。正式名：知源 / dsh-zhiyuan。产品对象仍称知识库。 */
import packageJson from '../../package.json' with { type: 'json' }

export const PACKAGE_NAME = 'dsh-zhiyuan'
export const PACKAGE_VERSION = packageJson.version
export const VERSION_LABEL = `v${PACKAGE_VERSION}`
export const SECTION_LABEL = '知源'
/** 知源在主侧栏全局面板（sidebar.panellist）里的身份与排序；插件 order 0、定时 order 10。 */
export const PANEL_ID = 'zhiyuan'
export const PANEL_ORDER = 1
/** 答案下方知源引用条在 turnTail 列表槽位里的条目身份。 */
export const TURN_TAIL_ID = 'zhiyuan.citations'
export const TARGET_DSH_VERSION = packageJson.dsh.targetVersion
export const DATA_DIR_NAME = 'dsh-zhiyuan'
export const COMMAND_NAME = 'kb'
export const MARK_USED_THROTTLE_MS = 60_000
