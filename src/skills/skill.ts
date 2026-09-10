import { readFileSync } from 'node:fs'

const SKILL_RESOURCE_PATH = 'skills/zhiyuan-kb/SKILL.md'
const SKILL_RESOURCE_URLS = [
  new URL('./zhiyuan-kb/SKILL.md', import.meta.url),
  new URL('./skills/zhiyuan-kb/SKILL.md', import.meta.url),
]
const SYSTEM_PROMPT_START = '<!-- dsh:system-prompt:start -->'
const SYSTEM_PROMPT_END = '<!-- dsh:system-prompt:end -->'

function loadSkillContent(): string {
  for (const resourceUrl of SKILL_RESOURCE_URLS) {
    const content = readSkillResource(resourceUrl)
    if (content === undefined) continue
    if (!content.trim()) throw new Error(`知源 Skill 文件为空：${SKILL_RESOURCE_PATH}`)
    return content
  }
  throw new Error(`无法读取知源 Skill 文件：${SKILL_RESOURCE_PATH}`)
}

function readSkillResource(resourceUrl: URL): string | undefined {
  try {
    return readFileSync(resourceUrl, 'utf8')
  } catch {
    return undefined
  }
}

function countOccurrences(content: string, marker: string): number {
  return content.split(marker).length - 1
}

function extractSystemPrompt(content: string): string {
  if (countOccurrences(content, SYSTEM_PROMPT_START) !== 1 || countOccurrences(content, SYSTEM_PROMPT_END) !== 1) {
    throw new Error(`知源 Skill 缺少唯一的 system prompt 标记：${SKILL_RESOURCE_PATH}`)
  }
  const start = content.indexOf(SYSTEM_PROMPT_START) + SYSTEM_PROMPT_START.length
  const end = content.indexOf(SYSTEM_PROMPT_END)
  const text = content.slice(start, end).trim()
  if (!text) throw new Error(`知源 Skill 的 system prompt 摘要为空：${SKILL_RESOURCE_PATH}`)
  return text
}

const SKILL_BODY = loadSkillContent()
const SYSTEM_PROMPT_TEXT = extractSystemPrompt(SKILL_BODY)

export const ZHIYUAN_SKILL = {
  name: 'zhiyuan-kb',
  description: '在用户指定的知识库中检索原文：先用 kb_search 获取文件 overview，再用 query、aliases 和 path 获取 file-detail；未指定库时先 kb_list。',
  whenToUse: '用户询问已导入知识库中的事实、条款、纪要，要求查找原文，或要求导入本机 md/markdown/txt/csv。',
  source: 'runtime' as const,
  content: SKILL_BODY,
}

export const ZHIYUAN_PROMPT_SECTION = {
  name: 'zhiyuan:identity',
  order: 170,
  text: SYSTEM_PROMPT_TEXT,
}

export function registerZhiyuanSkill(ctx: { skills?: { register: (skill: unknown) => () => void } }): () => void {
  return ctx.skills?.register(ZHIYUAN_SKILL) ?? (() => undefined)
}

export function registerZhiyuanPrompt(ctx: { systemPrompt?: { section: (section: unknown) => () => void } }): () => void {
  return ctx.systemPrompt?.section(ZHIYUAN_PROMPT_SECTION) ?? (() => undefined)
}
