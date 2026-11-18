import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

type Engine = Parameters<TestBody>[0]

/** 엔진이 실제 spawn 에서 채우는 고정 값. 테스트에서는 역할·부모·프롬프트만 바꾼다 */
const spawn = ($: Engine, subagentType: string, prompt: string, parentAgentId?: string) =>
  $.agent.spawn({
    tool_use_id: 'toolu_test',
    prompt,
    description: subagentType,
    subagentType: `gamemanager:${subagentType}`,
    provider: { plugin: 'gamemanager', tier: 'user' },
    parentModel: 'sonnet',
    background: true,
    fork: false,
    ...(parentAgentId === undefined ? {} : { parentAgentId }),
  })

/** 상대 경로가 절대 경로로 바뀌어 오므로, 기록 파일은 프로젝트 안의 경로 끝부분으로 찾는다 (.dev-team/live/x.json → .dev-team/live/x.json) */
const tail = (path: string) => path.replace(/\\/g, '/').replace(/^.*?\/?((docs|\.dev-team|guides)\/)/, '$1')

/**
 * 엔진 자리: agent.spawn 은 받은 프롬프트를 기록하고 a1, a2 ... 를 돌려준다. Write 는 성공시킨다.
 * 파일 시스템은 메모리이고, guides/programmer-guide.md 는 표시 문자열만 돌려준다.
 */
const engine = (on: On, seed: Record<string, string> = {}) => {
  const prompts: Record<string, string> = {}
  const files = new Map<string, string>(Object.entries(seed))
  let n = 0
  on('fs.exists', (_, e) => ({ value: files.has(tail(e.path)) }))
  on('fs.write', (_, e) => {
    files.set(tail(e.path), e.text)
    return { value: undefined }
  })
  on('fs.read', (_, e) => {
    if (tail(e.path) === 'guides/programmer-guide.md') return { value: '## Coding standards (test copy)' }
    const text = files.get(tail(e.path))
    if (text === undefined) throw new Error(`no file: ${e.path}`)
    return { value: text }
  })
  on('agent.spawn', (_, e) => {
    prompts[e.subagentType.replace('gamemanager:', '')] = e.prompt
    return { model: e.model ?? 'sonnet', agentId: `a${++n}` }
  })
  on('tool.call', { tool: 'Write' }, () => ({ result: 'written' }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('session.id', () => ({ value: 'test-session' }))
  on('clock.now', () => ({ value: Date.parse('2026-11-18T00:00:00Z') }))
  return { prompts, files }
}

test('프로그래머에게는 공통 지침이 붙고, 팀장에게는 붙지 않는다', async ($, on) => {
  const { prompts } = engine(on)

  const lead = await spawn($, 'tech-lead', 'Build the jump.')
  expect(lead.agentId).toBe('a1')
  await spawn($, 'client-programmer', 'Implement jump.', 'a1')

  expect(prompts['tech-lead']).toBe('Build the jump.')
  expect(prompts['client-programmer']).toContain('[Programmer Guide]')
  expect(prompts['client-programmer']).toContain('Coding standards')
  expect(prompts['client-programmer']).not.toContain('[Verification issue log]')
})

test('검증 문제 기록이 있으면 프로그래머에게 읽으라는 안내와 🚨 규칙이 붙는다', async ($, on) => {
  const { prompts } = engine(on, {
    'docs/verification-issues.md':
      '# 검증 문제 기록\n\n## 🚨 반드시 지킬 규칙\n\n### 🚨 V2. 빈 배열 접근 (3회)\n- **예방 규칙: 빈 배열 테스트를 함께 쓴다**\n\n## 문제 기록\n\n(없음)\n',
  })

  await spawn($, 'tech-lead', 'Build.')
  await spawn($, 'engine-engineer', 'Code.', 'a1')

  expect(prompts['engine-engineer']).toContain('[Verification issue log]')
  expect(prompts['engine-engineer']).toContain('빈 배열 테스트를 함께 쓴다')
})

test('팀장은 다른 팀 팀원을 부를 수 없다', async ($, on) => {
  engine(on)

  await spawn($, 'qa-lead', 'Review.')
  const r = await spawn($, 'client-programmer', 'Code it.', 'a1')
  expect(r.deny).toContain('부를 수 있는 agent')
})

test('검증 문제 기록은 QA 팀장만 쓴다', async ($, on) => {
  engine(on)

  await spawn($, 'qa-lead', 'Verify.')
  await spawn($, 'tech-lead', 'Build.')
  await spawn($, 'client-programmer', 'Code.', 'a2')

  const path = 'C:/game/docs/verification-issues.md'
  const byProgrammer = await $.tool.call({ tool: 'Write', file_path: path, content: 'x', agentId: 'a3' })
  expect(JSON.stringify(byProgrammer)).toContain('QA 팀장만')

  const byQa = await $.tool.call({ tool: 'Write', file_path: path, content: 'x', agentId: 'a1' })
  expect(JSON.stringify(byQa)).not.toContain('QA 팀장만')
})

test('조직 현황이 .dev-team/live/<세션>.json 에 남는다', async ($, on) => {
  const { files } = engine(on)

  await spawn($, 'design-lead', 'Design levels.')
  await spawn($, 'level-designer', 'Level 1-3.', 'a1')

  const live = JSON.parse(files.get('.dev-team/live/test-session.json') ?? '{}') as {
    ended: boolean
    roles: Record<string, { status: string }>
    teams: { key: string }[]
  }
  expect(live.ended).toBe(false)
  expect(live.roles['level-designer']?.status).toBe('running')
  expect(live.teams.map(t => t.key)).toEqual(['design', 'tech', 'content', 'qa'])
})
