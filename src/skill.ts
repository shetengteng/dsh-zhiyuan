const SKILL_BODY = [
  '# 知源 · 知识库检索',
  '',
  '你通过本插件查询用户显式导入的知识库。原文在本机文件夹里。',
  '',
  '## 何时使用',
  '用户问已导入资料里的事实、条款、纪要、说明时使用。不要用当前项目的 grep / glob / read 冒充知识库检索。',
  '',
  '## 选库（必须）',
  '1. 用户没点名库：必须先调用 `kb_list_bases`，用各库的 description 和 aliases 选一个 `baseId`。',
  '2. 两个库都像：问人，不要两个都搜，不要默认扫全部 bases。',
  '3. 用户已经点名库或给出 id：直接用那个 `baseId`。',
  '',
  '## 检索',
  '- 换词只做一次，放进同一次 `kb_search` 的 `aliases`（3～8 个）。禁止连调三十轮。',
  '- `kb_search` 必须带 `baseId`。没有 baseId 不要调用。',
  '- 可选 `category`：只有对上子文件夹名时才收窄；对不上就本库全扫，不要猜。',
  '',
  '## 出处',
  '- 没命中：不得说「根据知识库」。不要编一段可能相关的条款。',
  '- 命中：必须基于返回的 excerpt 回答，并带文件路径、行号和片段编号；引用编号使用 Markdown 行内代码包裹，例如命中了 `1` 处，不加方括号；不能只报路径。',
  '',
  '## 导入',
  '- 当前支持 md / txt / markdown / csv。CSV 导入时转成 UTF-8（含 GBK、UTF-16），可在知源中表格编辑。XLSX 转换属于后续阶段。',
  '- 用户话里没有库名就先问。禁止猜一个新库。禁止无 destCategory 就散落。',
  '- 导入不会自动建库。库不存在时提示先建库。',
].join('\n')

export const ZHIYUAN_SKILL = {
  name: 'zhiyuan-kb',
  description: '从用户指定的知识库里查找原文片段。没点名库时先 kb_list_bases；没命中不得说根据知识库。',
  whenToUse: '用户询问已导入知识库中的事实、条款、纪要，或要求导入本机 md/txt/csv。',
  source: 'runtime' as const,
  content: SKILL_BODY,
}

export const ZHIYUAN_PROMPT_SECTION = {
  name: 'zhiyuan:identity',
  order: 170,
  text: [
    '知源（知识库）：查询已导入资料必须先选定一个 baseId。',
    '用户没点名库时先 kb_list_bases，用描述和别名选一个库；两个都像就问人。',
    '禁止扫全部 bases。换词只做一次，放进同一次 kb_search 的 aliases。',
    '没命中不得说「根据知识库」。命中时必须基于返回的 excerpt 回答，带文件路径、行号和片段编号；引用编号使用 Markdown 行内代码包裹，例如命中了 `1` 处，不加方括号；当前项目的 grep / glob 不算知识库检索。',
  ].join(''),
}

export function registerZhiyuanSkill(ctx: { skills?: { register: (skill: unknown) => () => void } }): () => void {
  return ctx.skills?.register(ZHIYUAN_SKILL) ?? (() => undefined)
}

export function registerZhiyuanPrompt(ctx: { systemPrompt?: { section: (section: unknown) => () => void } }): () => void {
  return ctx.systemPrompt?.section(ZHIYUAN_PROMPT_SECTION) ?? (() => undefined)
}
