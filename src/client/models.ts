export type BaseSummary = {
  id: string
  title: string
  description: string
  aliases: string[]
  createdAt: number
  lastUsedAt: number
  categories: string[]
  approxDocs: number
  lastUsed: boolean
}

export type TreeNode = {
  name: string
  kind: 'dir' | 'file'
  path: string
  size?: number
  mtime?: number
  children?: TreeNode[]
}

export type SearchHit = {
  n: number
  path: string
  startLine: number
  endLine: number
  excerpt: string
}

export type Prefs = {
  defaultBaseId: string
  maxFileBytes: number
  maxBaseBytes: number
}

export type JobStatus = {
  running: boolean
  op?: string
  failed: Array<{ op: string; message: string; at: number }>
}

export type DialogKind = 'create' | 'edit' | 'import' | 'search' | 'preview' | 'confirm' | null
