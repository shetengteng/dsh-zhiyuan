import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  registerZhiyuanPrompt,
  registerZhiyuanSkill,
  ZHIYUAN_PROMPT_SECTION,
  ZHIYUAN_SKILL,
} from '../src/skills/skill.ts'

test('skill 正文锁住检索流程、边界、出处和导入规则', () => {
  const body = ZHIYUAN_SKILL.content
  const source = readFileSync(new URL('../src/skills/zhiyuan-kb/SKILL.md', import.meta.url), 'utf8')
  assert.equal(body, source)
  assert.equal(ZHIYUAN_SKILL.name, 'zhiyuan-kb')
  assert.match(ZHIYUAN_SKILL.description, /overview/)
  assert.match(ZHIYUAN_SKILL.description, /file-detail/)
  assert.match(ZHIYUAN_SKILL.whenToUse, /markdown/)
  assert.match(body, /kb_list_bases/)
  assert.match(body, /不要同时搜索两个库/)
  assert.match(body, /默认搜索全部 bases/)
  assert.match(body, /aliases/)
  assert.match(body, /`kb_search` 首次查询必须带 `baseId` 和 `query`/)
  assert.match(body, /不能只传 `baseId\/path`/)
  assert.match(body, /不是按 path 直接读取文件/)
  assert.match(body, /overview 只有文件摘要/)
  assert.match(body, /query\s*= overview\.query\.terms\[0\]/)
  assert.match(body, /aliases\s*= overview\.query\.aliases/)
  assert.match(body, /不能传整个 `overview\.query` 对象/)
  assert.match(body, /续页只传上页的 `cursor` 和可选 `limit`/)
  assert.match(body, /scan\.complete=false/)
  assert.match(body, /不得说“根据知识库”/)
  assert.match(body, /引用编号使用 Markdown 行内代码包裹/)
  assert.match(body, /命中了 `1` 处/)
  assert.doesNotMatch(body, /\[n\]/)
  assert.match(body, /不能只报告文件路径/)
  assert.match(body, /DSH 原生 `glob`、`grep`、`read`/)
  assert.match(body, /猜测 id/)
  assert.match(body, /`destCategory` 可选/)
  assert.match(body, /省略或为空表示导入到知识库根目录/)
  assert.doesNotMatch(body, /必须明确 `destCategory`/)
})

test('system prompt 段与 skill 同口径', () => {
  assert.equal(ZHIYUAN_PROMPT_SECTION.name, 'zhiyuan:identity')
  assert.equal(ZHIYUAN_PROMPT_SECTION.order, 170)
  assert.match(ZHIYUAN_PROMPT_SECTION.text, /`kb_list_bases`/)
  assert.match(ZHIYUAN_PROMPT_SECTION.text, /扫描全部 bases/)
  assert.match(ZHIYUAN_PROMPT_SECTION.text, /overview 只有文件路径和命中数，没有正文/)
  assert.match(ZHIYUAN_PROMPT_SECTION.text, /query: overview\.query\.terms\[0\]/)
  assert.match(ZHIYUAN_PROMPT_SECTION.text, /不能把整个 query 对象传给 query 字段/)
  assert.match(ZHIYUAN_PROMPT_SECTION.text, /续页只传上页的 `cursor` 和可选 `limit`/)
  assert.match(ZHIYUAN_PROMPT_SECTION.text, /不得说「根据知识库」/)
  assert.match(ZHIYUAN_PROMPT_SECTION.text, /Markdown 行内代码/)
  assert.match(ZHIYUAN_PROMPT_SECTION.text, /不能只传 `baseId\/path`/)
})

test('register 写入对应座椅；缺座椅不抛', () => {
  const skills: unknown[] = []
  const sections: unknown[] = []
  registerZhiyuanSkill({ skills: { register: (skill) => { skills.push(skill); return () => {} } } })
  registerZhiyuanPrompt({ systemPrompt: { section: (section) => { sections.push(section); return () => {} } } })
  assert.equal(skills[0], ZHIYUAN_SKILL)
  assert.equal(sections[0], ZHIYUAN_PROMPT_SECTION)
  registerZhiyuanSkill({})
  registerZhiyuanPrompt({})
})
