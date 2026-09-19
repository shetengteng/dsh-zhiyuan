import { PACKAGE_NAME } from '../../../model/package-info.ts'

/** 预览页类型的 kind：`openTab` 用它点名，不能与其他包重名。 */
export const PREVIEW_TAB_KIND = 'zhiyuan-preview'
/** tab 芯片文案；页类型只有一种内容，具体文件在预览头部展示。 */
export const PREVIEW_TAB_TITLE = '知源预览'

/**
 * 页类型的静态定义；只认 kind、不认资源地址。
 * 注册 id 同时是 tab body 座椅的 key，因此必须是全系统唯一的包名。
 */
export type PreviewTabDefinition = {
  id: string
  kind: string
  priority: 'extension'
  title: () => string
}

export function createPreviewTabDefinition(): PreviewTabDefinition {
  return {
    id: PACKAGE_NAME,
    kind: PREVIEW_TAB_KIND,
    priority: 'extension',
    title: () => PREVIEW_TAB_TITLE,
  }
}