import { EntryPreviewView, type EntryPreviewOptions, type PreviewStatus } from '../api.ts'

export type PreviewFocus = {
  view: typeof EntryPreviewView[keyof typeof EntryPreviewView]
  requestedLine?: number
  hasRequestedFocus: boolean
  previewStatus: PreviewStatus
  focusLine?: number
  focusColumnByte?: number
}

function isPositiveInteger(value: number | undefined): value is number {
  return Number.isInteger(value) && value >= 1
}

function isUtf8Boundary(line: string, columnByte: number): boolean {
  const bytes = Buffer.from(line, 'utf8')
  const offset = columnByte - 1
  return offset >= 0 && offset < bytes.length && (bytes[offset] & 0xc0) !== 0x80
}

function safeFocusColumn(line: string, columnByte: number | undefined): number | undefined {
  return isPositiveInteger(columnByte) && isUtf8Boundary(line, columnByte) ? columnByte : undefined
}

export function resolvePreviewFocus(
  lines: string[],
  actualFingerprint: string,
  options: EntryPreviewOptions,
): PreviewFocus {
  const view = options.view ?? EntryPreviewView.Tree
  const requestedLine = options.matchLine
  const hasRequestedFocus = view === EntryPreviewView.SearchHit && isPositiveInteger(requestedLine)
  const fingerprintMatches = !options.sourceFingerprint || options.sourceFingerprint === actualFingerprint
  let previewStatus: PreviewStatus = hasRequestedFocus && !fingerprintMatches ? 'stale' : 'ready'
  const requestedLineInFile = hasRequestedFocus && requestedLine <= lines.length
  const lineForFocus = requestedLineInFile ? lines[requestedLine - 1] : undefined
  const focusColumnByte = lineForFocus === undefined ? undefined : safeFocusColumn(lineForFocus, options.matchColumnByte)
  const columnIsValid = lineForFocus !== undefined && (options.matchColumnByte === undefined || focusColumnByte !== undefined)
  if (previewStatus === 'ready' && hasRequestedFocus && (!requestedLineInFile || !columnIsValid)) {
    previewStatus = 'fallback'
  }
  return {
    view,
    ...(hasRequestedFocus ? { requestedLine } : {}),
    hasRequestedFocus,
    previewStatus,
    ...(previewStatus === 'ready' && requestedLineInFile ? { focusLine: requestedLine } : {}),
    ...(previewStatus === 'ready' && columnIsValid && focusColumnByte !== undefined ? { focusColumnByte } : {}),
  }
}
