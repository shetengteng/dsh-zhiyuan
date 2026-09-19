/** 包与运行时身份。正式名：知源 / dsh-zhiyuan。产品对象仍称知识库。 */
import packageJson from '../../package.json' with { type: 'json' }

export const PACKAGE_NAME = 'dsh-zhiyuan'
export const PACKAGE_VERSION = packageJson.version
export const VERSION_LABEL = `v${PACKAGE_VERSION}`
export const SECTION_LABEL = '知源'
export const FOOTER_ACTION_ID = 'zhiyuan'
export const FOOTER_ACTION_ORDER = 50
export const TARGET_DSH_VERSION = packageJson.dsh.targetVersion
export const DATA_DIR_NAME = 'dsh-zhiyuan'
export const COMMAND_NAME = 'kb'
export const MARK_USED_THROTTLE_MS = 60_000
