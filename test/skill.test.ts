import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  registerZhiyuanPrompt,
  registerZhiyuanSkill,
  ZHIYUAN_PROMPT_SECTION,
  ZHIYUAN_SKILL,
} from '../src/skill.ts'

test('skill 正文锁住选库 / 换词 / 出处 / 导入硬规则', () => {
  const body = ZHIYUAN_SKILL.content
  assert.equal(ZHIYUAN_SKILL.name, 'zhiyuan-kb')
  assert.match(body, /kb_list_bases/)
  assert.match(body, /不要两个都搜/)
  assert.match(body, /不要默认扫全部 bases/)
  assert.match(body, /aliases/)
  assert.match(body, /禁止连调三十轮/)
  assert.match(body, /必须带 `baseId`/)
  assert.match(body, /不得说「根据知识库」/)
  assert.match(body, /\[n\]/)
  assert.match(body, /不能只报路径/)
  assert.match(body, /grep \/ glob \/ read/)
  assert.match(body, /禁止猜一个新库/)
  assert.match(body, /禁止无 destCategory 就散落/)
})

test('system prompt 段与 skill 同口径', () => {
  assert.equal(ZHIYUAN_PROMPT_SECTION.name, 'zhiyuan:identity')
  assert.equal(ZHIYUAN_PROMPT_SECTION.order, 170)
  assert.match(ZHIYUAN_PROMPT_SECTION.text, /先 kb_list_bases/)
  assert.match(ZHIYUAN_PROMPT_SECTION.text, /禁止扫全部 bases/)
  assert.match(ZHIYUAN_PROMPT_SECTION.text, /不得说「根据知识库」/)
  assert.match(ZHIYUAN_PROMPT_SECTION.text, /grep \/ glob 不算知识库检索/)
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
