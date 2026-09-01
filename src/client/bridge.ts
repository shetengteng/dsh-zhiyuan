export type Remote = {
  commands?: {
    execute: (sessionId: string, line: string, images: readonly unknown[], signal?: AbortSignal) => Promise<unknown>
  }
}

export type SessionsHandle = {
  open: (id: string) => void
  create?: (opts?: { workspaceId?: string }) => Promise<string>
  list?: { getSnapshot?: () => { current?: string } }
}

export type WorkspacesHandle = {
  connectWorkspace: (workspaceId: string) => Promise<string>
  list?: { getSnapshot?: () => { recentWorkspaceId?: string; items?: readonly { workspaceId: string }[] } }
}

export function unwrapCommandResult(exec: unknown): { kind?: string; text?: string } {
  const remote = exec as {
    ok?: boolean
    error?: { code?: string; message?: string }
    value?: { result?: { kind?: string; text?: string } }
    result?: { kind?: string; text?: string }
    kind?: string
    text?: string
  } | undefined
  if (remote && typeof remote === 'object' && 'ok' in remote) {
    if (!remote.ok) throw new Error(remote.error?.message || remote.error?.code || '命令失败')
    const result = remote.value?.result
    if (!result) throw new Error('Host 未注册 /kb，或当前没有会话')
    return result
  }
  return remote?.result ?? remote ?? {}
}

function listedSession(sessions?: SessionsHandle): string | undefined {
  try {
    return sessions?.list?.getSnapshot?.()?.current
  } catch {
    return undefined
  }
}

function recentWorkspace(workspaces?: WorkspacesHandle): string | undefined {
  try {
    const snap = workspaces?.list?.getSnapshot?.()
    return snap?.recentWorkspaceId ?? snap?.items?.[0]?.workspaceId
  } catch {
    return undefined
  }
}

export async function resolveSession(
  sessions?: SessionsHandle,
  workspaces?: WorkspacesHandle,
): Promise<string> {
  const currentSessionId = listedSession(sessions)
  if (currentSessionId) return currentSessionId
  const workspaceId = recentWorkspace(workspaces)
  if (workspaceId && typeof workspaces?.connectWorkspace === 'function') {
    const sessionId = await workspaces.connectWorkspace(workspaceId)
    if (sessionId) {
      sessions?.open?.(sessionId)
      return sessionId
    }
  }
  if (typeof sessions?.create === 'function') {
    const sessionId = await sessions.create({})
    if (sessionId) {
      sessions.open?.(sessionId)
      return sessionId
    }
  }
  throw new Error('当前没有会话，无法联系主进程')
}

export async function kbCall(
  remote: Remote | undefined,
  sessions: SessionsHandle | undefined,
  workspaces: WorkspacesHandle | undefined,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const execute = remote?.commands?.execute
  if (typeof execute !== 'function') throw new Error('断连：没有命令通道')
  const sessionId = await resolveSession(sessions, workspaces)
  const line = `/kb call ${JSON.stringify(payload)}`
  const result = unwrapCommandResult(await execute(sessionId, line, []))
  if (result.kind === 'error') throw new Error(result.text || '命令失败')
  return result.text ? JSON.parse(result.text) : null
}

export async function kbStatus(
  remote: Remote | undefined,
  sessions: SessionsHandle | undefined,
  workspaces: WorkspacesHandle | undefined,
): Promise<unknown> {
  const execute = remote?.commands?.execute
  if (typeof execute !== 'function') throw new Error('断连：没有命令通道')
  const sessionId = await resolveSession(sessions, workspaces)
  const result = unwrapCommandResult(await execute(sessionId, '/kb status', []))
  if (result.kind === 'error') throw new Error(result.text || '命令失败')
  return result.text ? JSON.parse(result.text) : { running: false, failed: [] }
}
