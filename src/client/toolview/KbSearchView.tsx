import type { RestFileCount, SearchFileGroup, SearchHit } from '../models.ts'
import { matchedExcerptLine } from '../search-utils.ts'
import { ensureSettingsStyles } from '../settings/styles.ts'
import { CitationTag } from '../CitationTag.tsx'
import type { PreviewController } from './preview/preview-state.ts'
import { isSamePreviewHit, usePreviewSelection } from './preview/preview-state.ts'

type ToolResultBlock = {
  kind?: string
  isError?: boolean
  content?: Array<{ type?: string; text?: string }>
  meta?: unknown
}

function firstTextContent(content: ToolResultBlock['content']): string {
  if (!Array.isArray(content)) return ''
  for (const block of content) {
    if (block?.type === 'text' && typeof block.text === 'string') return block.text
  }
  return ''
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function isSearchHit(value: unknown): value is SearchHit {
  if (!value || typeof value !== 'object') return false
  const hit = value as Partial<SearchHit>
  return typeof hit.n === 'number' && Number.isInteger(hit.n) && hit.n >= 1
    && typeof hit.path === 'string'
    && typeof hit.startLine === 'number' && Number.isInteger(hit.startLine) && hit.startLine >= 1
    && typeof hit.endLine === 'number' && Number.isInteger(hit.endLine) && hit.endLine >= hit.startLine
    && typeof hit.matchLine === 'number' && Number.isInteger(hit.matchLine)
    && hit.matchLine >= hit.startLine && hit.matchLine <= hit.endLine
    && typeof hit.excerpt === 'string'
    && (hit.matchedExcerpt === undefined || typeof hit.matchedExcerpt === 'string')
    && (hit.matchColumnByte === undefined || (typeof hit.matchColumnByte === 'number' && Number.isInteger(hit.matchColumnByte) && hit.matchColumnByte >= 1))
    && (hit.sourceFingerprint === undefined || typeof hit.sourceFingerprint === 'string')
}

function isSearchFileGroup(value: unknown): value is SearchFileGroup {
  if (!value || typeof value !== 'object') return false
  const group = value as Partial<SearchFileGroup>
  return typeof group.path === 'string'
    && (group.format === 'markdown' || group.format === 'csv')
    && typeof group.totalHits === 'number' && Number.isInteger(group.totalHits) && group.totalHits >= 0
    && Array.isArray(group.hits)
    && group.hits.every((hit) => isSearchHit(hit))
    && (group.groupHeader === undefined || typeof group.groupHeader === 'string')
}

function extractFileGroups(block?: ToolResultBlock): SearchFileGroup[] {
  const meta = asRecord(block?.meta)
  if (Array.isArray(meta?.files)) return meta.files.filter(isSearchFileGroup)
  return []
}

function extractBaseId(block?: ToolResultBlock): string {
  const baseId = asRecord(block?.meta)?.baseId
  return typeof baseId === 'string' ? baseId : ''
}

type SearchCoverage = {
  totalFiles: number
  totalHits: number
  restFiles: RestFileCount[]
  scanComplete: boolean
  hasMore: boolean
}

function extractSearchCoverage(block?: ToolResultBlock): SearchCoverage {
  const meta = asRecord(block?.meta)
  const restFiles = Array.isArray(meta?.restFiles)
    ? meta.restFiles.filter((item): item is RestFileCount => {
      const rest = asRecord(item)
      return rest ? typeof rest.path === 'string' && typeof rest.count === 'number' : false
    })
    : []
  return {
    totalFiles: typeof meta?.totalFiles === 'number' ? meta.totalFiles : 0,
    totalHits: typeof meta?.totalHits === 'number' ? meta.totalHits : 0,
    restFiles,
    scanComplete: meta?.scanComplete !== false,
    hasMore: meta?.hasMore === true,
  }
}

export function createKbSearchView(preview: PreviewController) {
  /** 在会话 toolview 中渲染 kb_search 命中：按文件分组，一页不跨文件。 */
  return function KbSearchView(props: { toolName?: string; block?: ToolResultBlock }) {
    ensureSettingsStyles()
    const block = props.block
    const running = !block || block.kind !== 'tool-result'
    const failed = block?.kind === 'tool-result' && Boolean(block.isError)
    const fileGroups = extractFileGroups(block)
    const baseId = extractBaseId(block)
    const coverage = extractSearchCoverage(block)
    const selectedHit = usePreviewSelection(preview)
    const pageHitCount = fileGroups.reduce((sum, group) => sum + group.hits.length, 0)

    if (running) return <div className="zy-help">正在检索知识库…</div>
    if (failed) return <div className="zy-note">{firstTextContent(block?.content) || '检索失败'}</div>
    if (!fileGroups.length) {
      return coverage.scanComplete
        ? <div className="zy-help">无命中</div>
        : <div className="zy-note">扫描未完成，当前无命中结果不能代表整个知识库</div>
    }

    return (
      <div>
        <div className="zy-search-overview">
          {coverage.totalFiles} 个文件 · {coverage.totalHits} 条命中 · 本页 {pageHitCount} 条
        </div>
        {fileGroups.map((group) => (
          <section key={group.path} className="zy-file-group">
            <div className="zy-file-group-head">
              <span className="zy-file-group-path" title={group.path}>{group.path}</span>
              <span className="zy-file-group-count">{group.hits.length}/{group.totalHits} 条</span>
              {group.groupHeader ? <span className="zy-file-group-header">{group.groupHeader}</span> : null}
            </div>
            {group.hits.map((hit) => {
              const selected = isSamePreviewHit(selectedHit, hit)
              return (
                <button
                  key={`${hit.n}-${hit.path}-${hit.startLine}-${hit.matchLine}`}
                  className={selected ? 'zy-hit is-selected' : 'zy-hit'}
                  type="button"
                  aria-pressed={selected}
                  onClick={(event) => preview.select({ baseId, hit }, event.currentTarget)}
                >
                  <div className="zy-src">
                    <CitationTag n={hit.n} />
                    <span className="zy-path">{hit.path}:{hit.startLine}–{hit.endLine}</span>
                  </div>
                  <div className="zy-quote">{matchedExcerptLine(hit)}</div>
                </button>
              )
            })}
          </section>
        ))}
        {coverage.restFiles.length ? (
          <div className="zy-search-rest">
            还有 {coverage.restFiles.map((item) => `${item.path}（${item.count} 条）`).join('、')} 未展示
          </div>
        ) : null}
        {coverage.hasMore || !coverage.scanComplete ? (
          <div className="zy-search-coverage">
            {coverage.hasMore ? '当前结果仍有更多命中。' : ''}
            {!coverage.scanComplete ? '本次扫描未完成，不能把当前结果当成全量。' : ''}
          </div>
        ) : null}
      </div>
    )
  }
}
