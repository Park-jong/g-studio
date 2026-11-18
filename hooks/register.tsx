import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Org, Priority, Req, ReqStatus, RoleState, RoleStatus, TeamKey } from '../types'

// ───────────── 조직 구성 ─────────────

type Team = { key: TeamKey; lead: string; label: string; members: string[] }

const TEAMS: Team[] = [
  { key: 'design', lead: 'design-lead', label: '기획 팀', members: ['system-designer', 'level-designer', 'balance-designer'] },
  { key: 'tech', lead: 'tech-lead', label: '개발 팀', members: ['client-programmer', 'server-programmer', 'tools-engineer', 'engine-engineer'] },
  { key: 'content', lead: 'content-lead', label: '콘텐츠 팀', members: ['scenario-writer', 'art-director', 'modeler', 'model-manager', 'sound-designer'] },
  { key: 'qa', lead: 'qa-lead', label: 'QA 팀', members: ['tester', 'code-reviewer'] },
]

const DIRECTOR = 'director'
/** 사용자 전용 Fable agent. 사용자가 그 메시지에서 직접 요청했을 때만 메인 세션이 부를 수 있다 */
const FABLE = 'fable-modeler'
const LEADS = TEAMS.map(t => t.lead)
const TEAM_KEYS = TEAMS.map(t => t.key)
const TEAM_NAME: Record<string, string> = {
  ...Object.fromEntries(TEAMS.map(t => [t.key, t.label])),
  user: '사용자',
}
const teamOfLead = (role: string) => TEAMS.find(t => t.lead === role)?.key

const LABEL: Record<string, string> = {
  main: '메인 세션',
  outside: '조직 밖의 agent',
  director: '총괄 디렉터 (메인 세션)',
  'fable-modeler': 'Fable 3D 모델러',
  'design-lead': '기획 팀장',
  'system-designer': '시스템 기획',
  'level-designer': '레벨 디자이너',
  'balance-designer': '밸런스 기획',
  'tech-lead': '개발 팀장',
  'client-programmer': '클라이언트',
  'server-programmer': '서버',
  'tools-engineer': '툴/빌드',
  'engine-engineer': '엔진/최적화',
  'content-lead': '콘텐츠 팀장',
  'scenario-writer': '시나리오 작가',
  'art-director': '아트 디렉터',
  modeler: '3D 모델러',
  'model-manager': '3D 모델 관리',
  'sound-designer': '사운드 기획',
  'qa-lead': 'QA 팀장',
  tester: '테스터',
  'code-reviewer': '코드 리뷰어',
}

/** subagent 로 존재하는 역할. 총괄 디렉터는 메인 세션이 맡으므로 agent 가 아니다 */
const ALL_ROLES = [FABLE, ...TEAMS.flatMap(t => [t.lead, ...t.members])]

/**
 * 누가 누구를 부를 수 있는가: 메인 세션(=총괄 디렉터) → 팀장 + Fable(사용자 요청 시), 팀장 → 자기 팀원.
 * Fable 은 여기에 더해 agent.spawn 에서 사용자 요청 여부(fablePermit)를 따로 확인한다.
 * 커밋은 agent 없이 메인 세션이 commit-release 스킬로 한다.
 */
const CALLABLE: Record<string, string[]> = {
  main: [...LEADS, FABLE],
  outside: [],
  ...Object.fromEntries(TEAMS.map(t => [t.lead, t.members])),
}

/** 프로그래머 지침(작업 규칙·코딩 규칙)과 검증 문제 기록 안내를 프롬프트에 붙이는 역할 */
const PROGRAMMERS = TEAMS.find(t => t.key === 'tech')!.members
const GUIDED = [...PROGRAMMERS, 'code-reviewer']
/** 검증 문제 기록. QA 팀장만 쓴다 (메인 세션은 템플릿으로 만들 때만) */
const ISSUES_FILE = 'docs/verification-issues.md'
const ISSUES_WRITERS = ['main', 'qa-lead']
const MAX_CRITICAL_CHARS = 4000

/**
 * 역할별 모델 (agents/*.md 의 model 과 같게 유지). 조직 안은 최대 Opus, Fable 은 사용자 전용 agent 만. 총괄 디렉터는 메인 세션의 모델.
 * 호출하는 쪽이 Agent 도구의 model 값을 넘겨도 이 값으로 고정한다.
 */
const MODEL: Record<string, 'opus' | 'sonnet' | 'haiku' | 'fable'> = {
  'level-designer': 'sonnet',
  'balance-designer': 'sonnet',
  'client-programmer': 'opus',
  'server-programmer': 'opus',
  'engine-engineer': 'opus',
  'code-reviewer': 'opus',
  'design-lead': 'sonnet',
  'tech-lead': 'sonnet',
  'content-lead': 'sonnet',
  'qa-lead': 'sonnet',
  'system-designer': 'sonnet',
  'tools-engineer': 'sonnet',
  'scenario-writer': 'sonnet',
  'art-director': 'sonnet',
  'model-manager': 'sonnet',
  tester: 'sonnet',
  'sound-designer': 'haiku',
  modeler: 'opus',
  'fable-modeler': 'fable',
}

const ICON: Record<RoleStatus, string> = { waiting: '○', running: '◐', done: '●', failed: '✕' }
const STATUS_TEXT: Record<RoleStatus, string> = { waiting: '대기', running: '진행 중', done: '완료', failed: '실패' }

// ───────────── 기록 파일 (.dev-team/) ─────────────

const ROOT = '.dev-team'
const F = {
  /** 전체 로드맵은 프로젝트 루트의 TODO.md (단계 = 마일스톤). 메인 세션이 roadmap 스킬 템플릿으로 만든다 */
  roadmap: 'TODO.md',
  guide: `${ROOT}/README.md`,
  reqJson: `${ROOT}/requests.json`,
  reqMd: `${ROOT}/requests.md`,
  teamRoadmap: (t: TeamKey) => `${ROOT}/teams/${t}/roadmap.md`,
  worklog: (t: TeamKey) => `${ROOT}/teams/${t}/worklog.md`,
  inbox: (t: TeamKey) => `${ROOT}/teams/${t}/inbox.md`,
}

const TOOL_ROUTE = 'mcp__gamestudio__route_request'
const TOOL_UPDATE = 'mcp__gamestudio__update_request'

const PRIORITIES: Priority[] = ['P0', 'P1', 'P2', 'P3']
const REQ_STATUSES: ReqStatus[] = ['open', 'accepted', 'in_progress', 'done', 'rejected']
const REQ_STATUS_TEXT: Record<ReqStatus, string> = {
  open: '접수',
  accepted: '수락',
  in_progress: '처리 중',
  done: '완료',
  rejected: '반려',
}
const isOpen = (r: Req) => r.status === 'open' || r.status === 'accepted' || r.status === 'in_progress'
const byPriority = (a: Req, b: Req) => a.priority.localeCompare(b.priority) || a.id.localeCompare(b.id)
const KIND_TEXT = { requirement: '요구사항', feedback: '피드백' } as const

const PRIORITY_RULES = [
  'P0: TODO.md 현재 단계 진행을 막는 문제(블로커, 진행 불가 버그). 받는 팀이 다음 작업에 반드시 포함',
  'P1: 현재 단계 안에 처리해야 하는 것',
  'P2: 다음 단계에 처리할 것',
  'P3: 개선 제안·아이디어·낮음 문제(백로그)',
].join('\n')

const today = async ($: EngineInterface) => new Date(await $.clock.now()).toISOString().slice(0, 10)

const TEMPLATES: [string, string][] = [
  // 세션 현황 파일(.dev-team/live/)은 실행할 때마다 바뀌므로 게임 저장소에 올리지 않는다.
  [`${ROOT}/live/.gitignore`, '*\n'],
  [
    F.guide,
    [
      '# dev-team 기록',
      '',
      '| 파일 | 내용 | 관리 |',
      '| --- | --- | --- |',
      '| `../TODO.md` | 전체 로드맵 (단계 = 마일스톤, 결정 기록) | 총괄 디렉터 |',
      '| `../docs/verification-issues.md` | 검증 문제 기록 | QA 팀장 |',
      '| `teams/<팀>/roadmap.md` | 팀 로드맵 | 각 팀장 |',
      '| `teams/<팀>/worklog.md` | 팀 업무 기록 | 각 팀장 |',
      '| `teams/<팀>/inbox.md` | 팀이 받은 요청 | 자동 생성 (직접 수정 금지) |',
      '| `requests.md`, `requests.json` | 전체 요청 대장 | 자동 생성 (직접 수정 금지) |',
      '| `live/<세션>.json` | 세션별 조직 현황 (대시보드용, git 제외) | 자동 생성 (직접 수정 금지) |',
      '',
      '팀 폴더: `design` 기획 · `tech` 개발 · `content` 콘텐츠 · `qa` QA',
      '',
      '## 다른 팀에 보내는 요청',
      '팀장 보고 → `[Cross-team requests]` → 메인 세션이 우선순위를 정해 `route_request`로 기록 → 받는 팀장이 `update_request`로 수락·처리·완료',
      '',
      '## 우선순위',
      ...PRIORITY_RULES.split('\n').map(l => `- ${l}`),
      '',
    ].join('\n'),
  ],
  ...TEAMS.flatMap((t): [string, string][] => [
    [
      F.teamRoadmap(t.key),
      [
        `# ${t.label} 로드맵`,
        '',
        `> 관리: ${LABEL[t.lead]}. 전체 로드맵(프로젝트 루트 \`TODO.md\`)의 현재 단계를 따른다.`,
        '',
        '## 현재 단계 목표',
        '',
        '## 할 일 (우선순위 순)',
        '| 우선순위 | 항목 | 출처 (디렉터 / REQ-번호) | 담당 | 상태 |',
        '| --- | --- | --- | --- | --- |',
        '',
        '## 완료',
        '',
      ].join('\n'),
    ],
    [
      F.worklog(t.key),
      [`# ${t.label} 업무 기록`, '', `> 관리: ${LABEL[t.lead]}. 작업이 끝날 때마다 맨 아래에 추가한다.`, ''].join('\n'),
    ],
  ]),
]

const requests = atom({ plugin: 'gamestudio', key: 'requests' } as const, [], { shape: 'requests-1' })

const ensureScaffold = async ($: EngineInterface) => {
  for (const [path, text] of TEMPLATES) {
    if (!(await $.fs.exists(path))) {
      await $.fs.write(path, text)
    }
  }
  if (!(await $.fs.exists(F.reqJson))) {
    await saveReqs($, [])
  }
}

const loadReqs = async ($: EngineInterface): Promise<Req[]> => {
  try {
    if (!(await $.fs.exists(F.reqJson))) return []
    const data: unknown = JSON.parse(await $.fs.read(F.reqJson))
    return Array.isArray(data) ? (data as Req[]) : []
  } catch {
    return []
  }
}

const reqBlock = (r: Req) =>
  [
    `### ${r.id} [${r.priority}] ${r.title}`,
    `- 보낸 팀: ${TEAM_NAME[r.from]} · 유형: ${KIND_TEXT[r.kind]} · 상태: ${REQ_STATUS_TEXT[r.status]} · 접수: ${r.createdAt}${r.milestone ? ` · 단계: ${r.milestone}` : ''}`,
    `- 우선순위 근거: ${r.priorityReason}`,
    '',
    r.detail,
    '',
    ...r.history.map(h => `- ${h.at} ${h.by}: ${REQ_STATUS_TEXT[h.status]}${h.note ? ` — ${h.note}` : ''}`),
    '',
  ].join('\n')

const saveReqs = async ($: EngineInterface, list: Req[]) => {
  const NOTE = '> dev-team이 자동 생성하는 파일입니다. 직접 고치지 말고 `update_request` 도구로 상태를 바꾸세요.'
  await $.fs.write(F.reqJson, JSON.stringify(list, null, 2) + '\n')

  const rows = [...list].sort(byPriority).map(
    r => `| ${r.id} | ${r.priority} | ${TEAM_NAME[r.from]} → ${TEAM_NAME[r.to]} | ${KIND_TEXT[r.kind]} | ${r.title.replace(/\|/g, '/')} | ${REQ_STATUS_TEXT[r.status]} | ${r.createdAt} |`,
  )
  await $.fs.write(
    F.reqMd,
    ['# 전체 요청 대장', '', NOTE, '', '| ID | 우선순위 | 방향 | 유형 | 제목 | 상태 | 접수일 |', '| --- | --- | --- | --- | --- | --- | --- |', ...rows, ''].join('\n'),
  )

  for (const t of TEAMS) {
    const mine = list.filter(r => r.to === t.key)
    const open = mine.filter(isOpen).sort(byPriority)
    const closed = mine.filter(r => !isOpen(r)).sort((a, b) => b.id.localeCompare(a.id))
    await $.fs.write(
      F.inbox(t.key),
      [
        `# ${t.label}이 받은 요청`,
        '',
        NOTE,
        '',
        `## 열린 요청 (우선순위 순, ${open.length}건)`,
        '',
        ...(open.length ? open.map(reqBlock) : ['없음', '']),
        `## 닫힌 요청 (${closed.length}건)`,
        '',
        ...closed.map(r => `- ${r.id} [${r.priority}] ${r.title} — ${REQ_STATUS_TEXT[r.status]}${r.history.at(-1)?.note ? ` (${r.history.at(-1)?.note})` : ''}`),
        '',
      ].join('\n'),
    )
  }

  await update($, requests, () => list)
}

// ───────────── 진행 상태 ─────────────

const PANE = 'dev-team'
const TITLE = '개발 조직 현황'

// 저장 형태가 바뀌면 shape 태그를 올려 이전 값을 버리게 한다.
const org = atom({ plugin: 'gamestudio', key: 'org' } as const, null, { shape: 'org-1' })

/**
 * Fable agent 호출 허가. 사용자 메시지가 들어올 때마다 그 메시지가 Fable 작업을 요청했는지로 다시 정한다.
 * 그래서 허가는 그 메시지에 대한 응답 동안만 유효하고, 다음 메시지에서 언급이 없으면 사라진다.
 */
const fablePermit = atom({ plugin: 'gamestudio', key: 'fablePermit' } as const, false, { shape: 'fable-1' })

const blank = (task: string, agents: Record<string, string> = {}): Org => ({ task, roles: {}, agents })

const roleOf = (subagentType: string | undefined): string | undefined => {
  const m = /^gamestudio:(.+)$/.exec(subagentType ?? '')
  return m && ALL_ROLES.includes(m[1]!) ? m[1] : undefined
}

const stateOf = (o: Org | null, role: string): RoleState => o?.roles[role] ?? { status: 'waiting', runs: 0 }

const setRole = (o: Org, role: string, patch: Partial<RoleState>): Org => ({
  ...o,
  roles: { ...o.roles, [role]: { ...stateOf(o, role), ...patch } },
})

/** 이 호출이 일어난 loop 의 역할: 메인이면 'main', 조직 밖 agent 면 undefined */
const callerRole = async ($: EngineInterface, agentId: string | undefined) =>
  agentId === undefined ? 'main' : (await read($, org))?.agents[agentId]

/**
 * 바깥(대시보드 웹페이지)에서 볼 수 있도록 조직 현황을 .dev-team/live/<세션 id>.json 에 남긴다.
 * $.state 는 세션 프로세스 안에만 있어서 다른 프로그램이 읽을 수 없기 때문이다. 실패해도 조직 동작에는 영향이 없다.
 */
const LIVE_DIR = `${ROOT}/live`
const writeLive = async ($: EngineInterface, opts: { ended?: boolean; onlyIfExists?: boolean } = {}) => {
  try {
    const id = await $.session.id()
    const path = `${LIVE_DIR}/${id}.json`
    if (opts.onlyIfExists && !(await $.fs.exists(path))) return
    const o = await read($, org)
    const live = {
      sessionId: id,
      updatedAt: new Date(await $.clock.now()).toISOString(),
      ended: opts.ended ?? false,
      task: o?.task ?? '',
      roles: o?.roles ?? {},
      teams: TEAMS.map(t => ({ key: t.key, label: t.label, lead: t.lead, members: t.members })),
      extra: [FABLE],
      labels: LABEL,
    }
    await $.fs.write(path, `${JSON.stringify(live, null, 2)}\n`)
  } catch {
    // 현황 파일은 보조 수단이다.
  }
}

const refreshStatus = async ($: EngineInterface) => {
  await writeLive($)
  const o = await read($, org)
  const running = ALL_ROLES.filter(r => stateOf(o, r).status === 'running')
  // 가장 아래 단계(팀원 > 팀장 > 디렉터)에서 일하는 역할을 보여준다.
  const deepest = running.filter(r => !running.some(c => CALLABLE[r]?.includes(c)))
  $.ui.status(
    deepest.length === 0
      ? undefined
      : `👷 gamestudio: ${deepest.map(r => LABEL[r]).join(', ')} 진행 중 (${running.length}명 작업 중)`,
  )
}

// ── 기록 파일 쓰기 권한 ──
const guardWrite = async ($: EngineInterface, agentId: string | undefined, filePath: string) => {
  const norm = filePath.replace(/\\/g, '/')
  const at = norm.indexOf(`/${ROOT}/`)
  const rel = at >= 0 ? norm.slice(at + ROOT.length + 2) : norm.startsWith(`${ROOT}/`) ? norm.slice(ROOT.length + 1) : null
  const role = await callerRole($, agentId)

  if (rel !== null && (rel === 'requests.json' || rel === 'requests.md' || /^teams\/[^/]+\/inbox\.md$/.test(rel))) {
    return `gamestudio: ${ROOT}/${rel} 는 자동 생성 파일입니다. 요청은 route_request / update_request 도구로만 바꿉니다.`
  }
  // 검증 문제 기록은 QA 팀장만 쓴다. 조직 밖 agent 는 건드리지 않는다.
  if (norm === ISSUES_FILE || norm.endsWith(`/${ISSUES_FILE}`)) {
    return role === undefined || ISSUES_WRITERS.includes(role)
      ? undefined
      : `gamestudio: ${ISSUES_FILE} 는 QA 팀장만 고칩니다. 문제와 예방 규칙은 보고서에 적어 올리세요.`
  }
  if (role === undefined || role === 'main') return undefined

  const team = teamOfLead(role)
  if (rel !== null) {
    if (team !== undefined && (rel === `teams/${team}/roadmap.md` || rel === `teams/${team}/worklog.md`)) return undefined
    return team !== undefined
      ? `gamestudio: ${LABEL[role]}은 자기 팀 기록(.dev-team/teams/${team}/roadmap.md, worklog.md)만 씁니다. 다른 팀에 필요한 것은 [Cross-team requests] 로 올리세요.`
      : `gamestudio: ${LABEL[role]}은 .dev-team 기록을 쓰지 않습니다. 기록은 팀장이 합니다. 다른 팀에 필요한 것은 [Cross-team requests] 로 보고하세요.`
  }
  if (team !== undefined) {
    return `gamestudio: ${LABEL[role]}은 산출물을 직접 만들지 않습니다. 팀원에게 맡기세요.`
  }
  return undefined
}

// ───────────── 메인 세션에 보내는 지시 ─────────────

const readGuide = async ($: EngineInterface) => {
  try {
    return await $.fs.read(`${$.plugin.root}/guides/director.md`)
  } catch {
    return '(Could not read guides/director.md. Delegate to the leads (gamestudio:design-lead, tech-lead, content-lead, qa-lead) with English prompts, record [Cross-team requests] in Korean with route_request, and report to the user in Korean.)'
  }
}

const ORCH_HEAD = '다음 게임 개발 작업을 총괄 디렉터로서 진행해 주세요. 아래 지침을 따릅니다.'

const orchestration = (task: string, guide: string, root: string) =>
  [
    ORCH_HEAD,
    '',
    `작업: ${task}`,
    '',
    `플러그인 폴더: ${root} (지침의 skills/..., guides/... 경로는 이 폴더 기준)`,
    `코드 작업이면 ${root}/skills/dev-cycle/SKILL.md 절차를 함께 따릅니다.`,
    '',
    '---',
    guide,
  ].join('\n')

/** 프로그래머·코드 리뷰어에게 붙이는 공통 지침 (guides/programmer-guide.md) */
const PROGRAMMER_GUIDE_TAG = '[Programmer Guide]'
const programmerGuide = async ($: EngineInterface) => {
  try {
    return await $.fs.read(`${$.plugin.root}/guides/programmer-guide.md`)
  } catch {
    return 'Read CLAUDE.md, the TODO.md item and docs/verification-issues.md before coding. Restate What/How/Why, stay within the spec, follow SOLID and clean code without over-engineering, and report a change table and the verification issues you applied.'
  }
}

/** 검증 문제 기록의 "## 🚨 ..." 섹션 본문. 없거나 비어 있으면 '' */
const criticalSection = (text: string) => {
  const m = /^## 🚨[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(text)
  if (!m) return ''
  const body = (m[1] ?? '').replace(/<!--[\s\S]*?-->/g, '').trim()
  if (!body || body === '(없음)') return ''
  return body.length > MAX_CRITICAL_CHARS ? `${body.slice(0, MAX_CRITICAL_CHARS)}\n…(truncated; read the whole file)` : body
}

/** 프로그래머 프롬프트 끝에 붙이는 검증 문제 기록 안내. 파일이 없으면 '' */
const issueLogNotice = async ($: EngineInterface) => {
  const text = await readText($, ISSUES_FILE)
  if (text === undefined) return ''
  const critical = criticalSection(text)
  return [
    `[Verification issue log] Before writing code, read all of \`${ISSUES_FILE}\` and follow its prevention rules so the same problems do not happen again. End your report with "Applied verification issues: V<n>, ..." (or "none").`,
    critical ? `\n🚨 Repeated 3+ times — must follow:\n${critical}` : '',
  ].join('')
}

const fablePrompt = (request: string) =>
  [
    `사용자가 Fable 3D 모델러 작업을 직접 요청했습니다. Agent 도구로 subagent_type "gamestudio:${FABLE}" 를 호출해 아래 요청을 맡겨 주세요.`,
    '프롬프트는 영어로 쓰고, 맨 앞에 [Project Context] 블록(장르, 엔진, 폴더 구조, 모델 명세가 있으면 그 경로)을 붙입니다.',
    '',
    `요청: ${request}`,
    '',
    '끝나면 영어 보고(모델 파일, 스크립트, 미리보기 경로, 측정값, 사람이 다듬을 부분)를 한국어로 요약해 알려 주세요.',
    '보고에 [Cross-team requests] 가 있으면 우선순위를 정해 mcp__gamestudio__route_request 로 한국어로 기록합니다 (from 은 user).',
  ].join('\n')

/** 사용자가 직접 쓴 부분만 본다. /dev-team 지시문은 지침 본문을 빼고 작업 줄만 */
const userPart = (text: string) => (text.startsWith(ORCH_HEAD) ? (/^작업: (.*)$/m.exec(text)?.[1] ?? '') : text)
const asksFable = (text: string) => /fable|페이블/i.test(userPart(text))

// ───────────── /dev-team-status ─────────────

const readText = async ($: EngineInterface, path: string) => {
  try {
    return (await $.fs.exists(path)) ? await $.fs.read(path) : undefined
  } catch {
    return undefined
  }
}

/** 마크다운에서 "## <제목>" 섹션 본문을 꺼낸다 (다음 ## 전까지) */
const section = (md: string | undefined, title: string) => {
  if (md === undefined) return []
  const lines = md.split(/\r?\n/)
  const start = lines.findIndex(l => l.startsWith('## ') && l.includes(title))
  if (start < 0) return []
  const end = lines.findIndex((l, i) => i > start && l.startsWith('## '))
  return lines.slice(start + 1, end < 0 ? undefined : end).filter(l => l.trim() !== '')
}

/** 표 섹션의 데이터 행만 (머리줄·구분줄 제외) */
const tableRows = (rows: string[]) => rows.filter(l => l.startsWith('|')).slice(2)

const statusReport = async ($: EngineInterface, arg: string) => {
  const o = await read($, org)
  const reqs = (await loadReqs($)).filter(isOpen).sort(byPriority)
  const team = TEAMS.find(t => t.key === arg || t.label.startsWith(arg) || LABEL[t.lead]!.startsWith(arg))
  const out: string[] = []

  // 특정 팀 상세
  if (arg !== '' && team !== undefined) {
    const roadmap = await readText($, F.teamRoadmap(team.key))
    const worklog = await readText($, F.worklog(team.key))
    const mine = reqs.filter(r => r.to === team.key)
    out.push(`📋 ${team.label} 현황`, '')
    out.push('■ 진행 상태')
    for (const r of [team.lead, ...team.members]) {
      const st = stateOf(o, r)
      out.push(`- ${ICON[st.status]} ${LABEL[r]} · ${STATUS_TEXT[st.status]}${st.runs > 1 ? ` (${st.runs}회차)` : ''}${st.task ? ` — ${st.task}` : ''}`)
    }
    out.push('', '■ 할 일 (팀 로드맵)')
    const todo = tableRows(section(roadmap, '할 일'))
    out.push(...(todo.length ? todo : ['- 없음']))
    out.push('', `■ 받은 요청 (${mine.length}건)`)
    out.push(...(mine.length ? mine.map(r => `- ${r.priority} ${r.id} ${TEAM_NAME[r.from]}→ · ${r.title} (${REQ_STATUS_TEXT[r.status]})`) : ['- 없음']))
    const entries = (worklog ?? '').split(/\n(?=## )/).filter(b => b.startsWith('## ')).slice(-2)
    out.push('', '■ 최근 업무 기록')
    out.push(...(entries.length ? entries.map(b => b.trim()) : ['- 없음']))
    out.push('', `기록: ${F.teamRoadmap(team.key)}, ${F.worklog(team.key)}, ${F.inbox(team.key)}`)
    return out.join('\n')
  }

  // 전체 요약
  const roadmap = await readText($, F.roadmap)
  const current = section(roadmap, '현재 상태')
  out.push('📋 dev-team 현재 작업', '')
  out.push(`■ 맡긴 작업: ${o?.task || '없음'}`)
  out.push(...(current.length ? ['■ 현재 상태 (TODO.md)', ...current] : ['■ TODO.md 없음 — /gamestudio:new-game 또는 /gamestudio:roadmap 으로 만듭니다']))
  out.push('')

  const running = ALL_ROLES.filter(r => stateOf(o, r).status === 'running')
  const failed = ALL_ROLES.filter(r => stateOf(o, r).status === 'failed')
  const done = ALL_ROLES.filter(r => stateOf(o, r).status === 'done')
  out.push(`■ 진행 중 (${running.length})`)
  out.push(...(running.length ? running.map(r => `- ◐ ${LABEL[r]}${stateOf(o, r).task ? ` — ${stateOf(o, r).task}` : ''}`) : ['- 없음']))
  if (failed.length) out.push(`■ 실패 (${failed.length})`, ...failed.map(r => `- ✕ ${LABEL[r]}${stateOf(o, r).task ? ` — ${stateOf(o, r).task}` : ''}`))
  if (done.length) out.push(`■ 완료: ${done.map(r => LABEL[r]).join(', ')}`)
  out.push('')

  out.push('■ 팀별 할 일 (상위 3개)')
  for (const t of TEAMS) {
    const todo = tableRows(section(await readText($, F.teamRoadmap(t.key)), '할 일'))
    out.push(`- ${t.label}: ${todo.length === 0 ? '없음' : `${todo.length}건`}`)
    out.push(...todo.slice(0, 3).map(l => `    ${l}`))
  }
  out.push('')

  out.push(`■ 열린 타 팀 요청 (${reqs.length}건)`)
  out.push(...(reqs.length ? reqs.slice(0, 10).map(r => `- ${r.priority} ${r.id} ${TEAM_NAME[r.from]}→${TEAM_NAME[r.to]} · ${r.title} (${REQ_STATUS_TEXT[r.status]})`) : ['- 없음']))
  if (reqs.length > 10) out.push(`- 외 ${reqs.length - 10}건 — ${F.reqMd}`)
  out.push('', '팀 상세: /dev-team-status design | tech | content | qa')
  return out.join('\n')
}

// ───────────── hooks ─────────────

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'dev-team',
      description: '메인 세션이 총괄 디렉터로서 게임 개발 작업을 팀장→팀원 조직에 나눠 맡깁니다 (인자 없이 실행하면 조직 현황 패널만 엽니다)',
      argumentHint: '<작업 내용>',
    })
    await $.command.register({
      name: 'dev-team-status',
      description: '지금 맡긴 작업, 진행 중인 역할, 팀별 할 일, 열린 타 팀 요청을 보여 줍니다 (팀 이름을 주면 그 팀 상세)',
      argumentHint: '[design|tech|content|qa]',
    })
    await $.command.register({
      name: 'dev-team-fable',
      description: '사용자 전용 Fable 3D 모델러에게 작업을 맡깁니다 (팀장은 부를 수 없고, 사용자 요청이 있을 때만 동작)',
      argumentHint: '<요청 내용>',
    })

    await $.tool.register({
      name: 'route_request',
      description: [
        'dev-team 조직에서 한 팀이 다른 팀에 보내는 피드백·요구사항을 받는 팀의 요청함(.dev-team/teams/<팀>/inbox.md)과 요청 대장에 기록하고 우선순위를 정한다.',
        '메인 세션(총괄 디렉터) 전용: 팀장 보고의 [Cross-team requests] 항목(영어)을 한국어로 옮겨 기록하거나 사용자가 특정 팀에 주는 피드백을 전달할 때 쓴다.',
        '팀: design(기획) · tech(개발) · content(콘텐츠) · qa(QA). 사용자가 직접 주는 요청은 from 을 user 로.',
        '우선순위 기준(TODO.md 의 현재 단계 기준으로 판단):',
        PRIORITY_RULES,
      ].join('\n'),
      inputSchema: {
        type: 'object',
        properties: {
          from: { type: 'string', enum: [...TEAM_KEYS, 'user'], description: '요청한 팀' },
          to: { type: 'string', enum: TEAM_KEYS, description: '받을 팀' },
          kind: { type: 'string', enum: ['requirement', 'feedback'], description: '요구사항 또는 피드백' },
          title: { type: 'string', description: '한 줄 제목' },
          detail: { type: 'string', description: '내용과 근거/영향' },
          priority: { type: 'string', enum: PRIORITIES },
          priority_reason: { type: 'string', description: '이 우선순위로 정한 이유' },
          milestone: { type: 'string', description: '관련 단계 (TODO.md, 선택)' },
        },
        required: ['from', 'to', 'kind', 'title', 'detail', 'priority', 'priority_reason'],
      },
      isDeferred: false,
    })
    await $.tool.register({
      name: 'update_request',
      description: [
        'dev-team 요청(REQ-번호)의 상태를 바꾼다. 받는 팀의 팀장이 수락(accepted)·처리 중(in_progress)·완료(done)·반려(rejected)를 기록할 때 쓴다.',
        '반려와 완료에는 note 에 이유나 산출물 경로를 적는다. 우선순위 변경(priority)은 메인 세션만 할 수 있다.',
      ].join('\n'),
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'REQ-001 형식' },
          status: { type: 'string', enum: REQ_STATUSES },
          note: { type: 'string' },
          priority: { type: 'string', enum: PRIORITIES, description: '메인 세션 전용' },
        },
        required: ['id', 'status'],
      },
      isDeferred: false,
    })

    await update($, requests, () => [])
    const list = await loadReqs($)
    await update($, requests, () => list)

    return next(e)
  })

  on('command.run', { command: 'dev-team' }, async ($, e) => {
    const task = e.args.trim()
    await ensureScaffold($)
    await $.ui.open({ id: PANE, title: TITLE })

    if (task === '') {
      return { text: '개발 조직 현황 패널을 열었습니다. 기록은 `.dev-team/` 에 있습니다. `/dev-team <작업 내용>`으로 작업을 맡기세요.' }
    }

    await update($, org, o => blank(task, o?.agents))
    // 프롬프트는 이 명령이 끝난 뒤에 시작되므로 기다리지 않는다 (기다리면 교착 상태).
    void $.prompt.submit({ text: orchestration(task, await readGuide($), $.plugin.root) })

    return { text: `총괄 디렉터(메인 세션)가 작업을 시작합니다: ${task}` }
  })

  on('command.run', { command: 'dev-team-status' }, async ($, e) => {
    return { text: await statusReport($, e.args.trim()) }
  })

  on('command.run', { command: 'dev-team-fable' }, async ($, e) => {
    const request = e.args.trim()
    if (request === '') {
      return { text: '사용법: `/dev-team-fable <요청 내용>` — 사용자 전용 Fable 3D 모델러에게 작업을 맡깁니다.' }
    }

    await update($, fablePermit, () => true)
    void $.prompt.submit({ text: fablePrompt(request) })

    return { text: `Fable 3D 모델러에게 작업을 맡깁니다: ${request}` }
  })

  // ── Fable 호출 허가: 사용자 메시지마다 다시 정한다 ──
  on('prompt.submit', async ($, e, next) => {
    await update($, fablePermit, () => asksFable(e.text))
    return next(e)
  }).catch(($, e, next) => next(e))

  // ── 타 팀 요청: 메인 세션만 기록 ──
  on('tool.call', { tool: /^mcp__gamestudio__route_request$/ }, async ($, e) => {
    if (e.agentId !== undefined) {
      return { deny: 'gamestudio: 타 팀 요청은 총괄 디렉터(메인 세션)만 기록할 수 있습니다. 보고서 끝의 [Cross-team requests] 에 적어 올리세요.' }
    }
    const a = e as unknown as Record<string, unknown>
    const str = (k: string) => (typeof a[k] === 'string' ? (a[k] as string).trim() : '')
    const from = str('from')
    const to = str('to')
    const kind = str('kind')
    const priority = str('priority')

    if (![...TEAM_KEYS, 'user'].includes(from) || !TEAM_KEYS.includes(to as TeamKey)) {
      return { deny: `from 은 ${[...TEAM_KEYS, 'user'].join('/')}, to 는 ${TEAM_KEYS.join('/')} 중 하나여야 합니다.` }
    }
    if (from === to) {
      return { deny: '같은 팀 안의 일은 타 팀 요청이 아닙니다. 그 팀 로드맵에서 다룹니다.' }
    }
    if (kind !== 'requirement' && kind !== 'feedback') return { deny: 'kind 는 requirement 또는 feedback 입니다.' }
    if (!PRIORITIES.includes(priority as Priority)) return { deny: 'priority 는 P0~P3 입니다.' }
    if (str('title') === '' || str('priority_reason') === '') return { deny: 'title 과 priority_reason 은 비울 수 없습니다.' }

    await ensureScaffold($)
    const list = await loadReqs($)
    const dup = list.find(r => isOpen(r) && r.to === to && r.title === str('title'))
    if (dup) {
      return { result: `이미 열려 있는 요청입니다: ${dup.id} [${dup.priority}] ${dup.title}. 새로 기록하지 않았습니다.` }
    }

    const next = Math.max(0, ...list.map(r => Number(r.id.replace(/\D/g, '')) || 0)) + 1
    const id = `REQ-${String(next).padStart(3, '0')}`
    const date = await today($)
    const req: Req = {
      id,
      from: from as Req['from'],
      to: to as TeamKey,
      kind,
      title: str('title'),
      detail: str('detail'),
      priority: priority as Priority,
      priorityReason: str('priority_reason'),
      milestone: str('milestone') || undefined,
      status: 'open',
      createdAt: date,
      history: [{ at: date, by: '메인 세션', status: 'open', note: `우선순위 ${priority}` }],
    }
    await saveReqs($, [...list, req])
    $.ui.toast(`📨 ${id} ${TEAM_NAME[from]} → ${TEAM_NAME[to]} [${priority}] ${req.title}`)

    return { result: `${id} 기록 완료: ${TEAM_NAME[from]} → ${TEAM_NAME[to]}, ${priority}. 받는 팀 요청함: ${F.inbox(to as TeamKey)}` }
  }).catch(() => ({ deny: 'gamestudio: 요청을 기록하는 중 오류가 났습니다. .dev-team/requests.json 을 확인하세요.' }))

  // ── 요청 상태 변경: 받는 팀의 팀장(또는 메인 세션) ──
  on('tool.call', { tool: /^mcp__gamestudio__update_request$/ }, async ($, e) => {
    const a = e as unknown as Record<string, unknown>
    const id = String(a.id ?? '').trim().toUpperCase()
    const status = String(a.status ?? '') as ReqStatus
    const note = typeof a.note === 'string' && a.note.trim() !== '' ? a.note.trim() : undefined
    const priority = typeof a.priority === 'string' ? (a.priority as Priority) : undefined

    if (!REQ_STATUSES.includes(status)) return { deny: `status 는 ${REQ_STATUSES.join('/')} 중 하나입니다.` }

    const list = await loadReqs($)
    const req = list.find(r => r.id === id)
    if (!req) return { deny: `${id} 요청이 없습니다. .dev-team/requests.md 를 확인하세요.` }

    const role = await callerRole($, e.agentId)
    const isMain = role === 'main'
    if (!isMain && (role === undefined || teamOfLead(role) !== req.to)) {
      return { deny: `gamestudio: ${id} 는 ${TEAM_NAME[req.to]} 요청입니다. ${TEAM_NAME[req.to]}장만 상태를 바꿀 수 있습니다.` }
    }
    if (priority !== undefined && (!isMain || !PRIORITIES.includes(priority))) {
      return { deny: 'gamestudio: 우선순위는 메인 세션만 바꿀 수 있습니다. 바꿔야 하면 보고서에 이유를 적으세요.' }
    }
    if ((status === 'rejected' || status === 'done') && note === undefined) {
      return { deny: '완료·반려에는 note(산출물 경로나 반려 이유)가 필요합니다.' }
    }

    const by = isMain ? '메인 세션' : LABEL[role!]!
    const changed: Req = {
      ...req,
      status,
      priority: priority ?? req.priority,
      history: [
        ...req.history,
        { at: await today($), by, status, note: priority && priority !== req.priority ? `우선순위 ${req.priority}→${priority}${note ? ` · ${note}` : ''}` : note },
      ],
    }
    await saveReqs($, list.map(r => (r.id === id ? changed : r)))
    if (status === 'done' || status === 'rejected') {
      $.ui.toast(`${status === 'done' ? '✅' : '↩'} ${id} ${REQ_STATUS_TEXT[status]} — ${TEAM_NAME[req.to]}`)
    }

    return { result: `${id}: ${REQ_STATUS_TEXT[req.status]} → ${REQ_STATUS_TEXT[status]}` }
  }).catch(() => ({ deny: 'gamestudio: 요청 상태를 바꾸는 중 오류가 났습니다. .dev-team/requests.json 을 확인하세요.' }))

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const deny = await guardWrite($, e.agentId, e.file_path)
    return deny ? { deny } : next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const deny = await guardWrite($, e.agentId, e.file_path)
    return deny ? { deny } : next(e)
  }).catch(($, e, next) => next(e))

  // ── 조직 규칙: 호출 관계 검사, 모델 고정, 역할 기록 ──
  on('agent.spawn', async ($, e, next) => {
    const role = roleOf(e.subagentType)
    if (role === undefined || e.resume !== undefined) {
      return next(e)
    }

    const before = await read($, org)
    const parent =
      e.parentAgentId === undefined ? 'main' : (before?.agents[e.parentAgentId] ?? 'outside')

    if (role === FABLE) {
      if (parent !== 'main') {
        return { deny: `gamestudio 조직 규칙: ${LABEL[FABLE]}는 사용자 전용입니다. 팀장이나 다른 agent는 부를 수 없습니다. 3D 모델 작업은 gamestudio:modeler 에게 맡기세요.` }
      }
      if (!(await read($, fablePermit))) {
        return {
          deny:
            `gamestudio 조직 규칙: ${LABEL[FABLE]}는 사용자가 직접 요청했을 때만 부릅니다. 이번 사용자 메시지에는 Fable 요청이 없습니다. ` +
            '3D 모델 작업은 콘텐츠 팀장(gamestudio:content-lead)에게 맡기거나, 사용자에게 /dev-team-fable 로 요청해 달라고 안내하세요.',
        }
      }
    }

    if (!(CALLABLE[parent] ?? []).includes(role)) {
      const allowed = (CALLABLE[parent] ?? []).map(r => `gamestudio:${r}`).join(', ')
      return {
        deny:
          `gamestudio 조직 규칙: ${LABEL[parent]}은(는) ${LABEL[role]}을(를) 직접 부를 수 없습니다. ` +
          (allowed !== ''
            ? `부를 수 있는 agent: ${allowed}`
            : parent === 'outside'
              ? '조직 agent는 메인 세션(팀장)과 팀장(자기 팀원)만 부릅니다.'
              : '팀원은 다른 agent를 부르지 않습니다.'),
      }
    }

    if (parent === 'main' && LEADS.includes(role)) {
      await ensureScaffold($)
    }

    // 실행 방식(foreground/background)은 건드리지 않는다. 이 환경에서는 hook 이 background:false 를 넘겨도
    // subagent 가 백그라운드로 돌았다(2026-11-14 테스트). 그래서 기다림은 지침으로 보장한다:
    // 팀장은 팀원 결과가 모두 올 때까지 최종 보고를 하지 않고, 결과는 새 턴으로 깨어나며 받는다.
    // 메인 세션도 팀장의 완료 알림을 받아 다음 팀에 넘기며, 그동안 사용자와 대화하거나 중단할 수 있다.
    // 프로그래머·코드 리뷰어: 공통 지침(작업 규칙·코딩 규칙)을, 프로그래머: 검증 문제 기록 안내를 프롬프트 끝에 붙인다.
    // 플러그인 agent 정의는 다른 파일을 포함할 수 없어서, 여러 agent 가 같이 쓰는 규칙은 여기서 한 곳(guides/)에서 넣는다.
    let prompt = e.prompt
    if (GUIDED.includes(role) && !prompt.includes(PROGRAMMER_GUIDE_TAG)) {
      prompt += `\n\n---\n${PROGRAMMER_GUIDE_TAG}\n${await programmerGuide($)}`
      if (PROGRAMMERS.includes(role)) {
        const notice = await issueLogNotice($)
        if (notice) prompt += `\n\n---\n${notice}`
      }
    }

    const started = await next({ ...e, prompt, model: MODEL[role] ?? e.model })
    if (started.deny !== undefined || started.agentId === undefined) {
      return started
    }

    const agentId = started.agentId
    await update($, org, o => {
      const base = o ?? blank('')
      const st = stateOf(base, role)
      return setRole(
        { ...base, agents: { ...base.agents, [agentId]: role } },
        role,
        { status: 'running', runs: st.runs + 1, task: e.description, detail: undefined },
      )
    })
    await refreshStatus($)

    return started
  }).catch(($, e, next) => (next.called ? next(e) : { deny: 'gamestudio: 조직 규칙 검사 중 오류가 났습니다.' }))

  // subagent 가 다시 일을 시작하면(자식 결과로 깨어남 등) 진행 중으로 되돌린다.
  on('turn.start', async ($, e, next) => {
    if (e.agentId !== undefined) {
      const role = (await read($, org))?.agents[e.agentId]
      if (role !== undefined) {
        await update($, org, o => (o === null ? o : setRole(o, role, { status: 'running', detail: undefined })))
        await refreshStatus($)
      }
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined) {
      return result
    }

    const role = (await read($, org))?.agents[e.agentId]
    if (role === undefined) {
      return result
    }

    const hasFailed = e.reason !== 'answer' || e.isAborted

    // 팀장이 팀원 결과를 기다리느라 턴을 끝낸 경우: 아직 일하는 중이므로 완료로 바꾸지 않는다.
    const team = TEAMS.find(t => t.lead === role)
    const o0 = await read($, org)
    if (!hasFailed && team !== undefined && team.members.some(m => stateOf(o0, m).status === 'running')) {
      await update($, org, o => (o === null ? o : setRole(o, role, { status: 'running', detail: '팀원 결과 대기' })))
      await refreshStatus($)
      return result
    }

    let detail: string | undefined
    if (role === 'qa-lead' && !hasFailed) {
      // 보고는 영어(Verdict: APPROVED / CHANGES REQUESTED). 예전 한국어 판정도 받아 준다.
      detail = /CHANGES REQUESTED|수정 요청/i.test(e.answer) ? '수정 요청' : /APPROVED|승인/i.test(e.answer) ? '승인' : undefined
    }

    await update($, org, o =>
      o === null ? o : setRole(o, role, { status: hasFailed ? 'failed' : 'done', detail }),
    )

    if (hasFailed) {
      $.ui.toast(`✕ gamestudio: ${LABEL[role]} 작업이 실패했습니다`)
    } else {
      $.ui.toast(`✅ ${LABEL[role]} 완료${detail ? ` — ${detail}` : ''}`)
    }
    await refreshStatus($)

    return result
  })

  // 세션이 끝나면 대시보드가 진행 중으로 오해하지 않도록 현황 파일에 종료를 남긴다.
  on('session.end', async ($, e, next) => {
    await writeLive($, { ended: true, onlyIfExists: true })
    return next(e)
  })

  // ───────────── 조직도 패널 ─────────────

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const o = await read($, org)
    const reqs = await read($, requests)
    const openReqs = reqs.filter(isOpen).sort(byPriority)

    const inboxBadge = (team: TeamKey) => {
      const mine = openReqs.filter(r => r.to === team)
      if (mine.length === 0) return ''
      const counts = PRIORITIES.map(p => [p, mine.filter(r => r.priority === p).length] as const)
        .filter(([, n]) => n > 0)
        .map(([p, n]) => `${p}×${n}`)
      return `  📨 ${counts.join(' ')}`
    }

    // 총괄 디렉터(메인 세션)는 팀장 중 누군가 일하는 동안 진행 중으로 보인다.
    const directorState = (): RoleState => ({
      status: LEADS.some(r => stateOf(o, r).status === 'running') ? 'running' : 'waiting',
      runs: 0,
    })

    const line = (prefix: string, role: string, extra = '') => {
      const st = role === DIRECTOR ? directorState() : stateOf(o, role)
      const isManager = role === DIRECTOR || LEADS.includes(role)
      return (
        <Text dimColor={st.status === 'waiting' && extra === ''} bold={st.status === 'running' || role === DIRECTOR}>
          {prefix}
          {ICON[st.status]} {LABEL[role]}
          {st.status !== 'waiting' ? ` · ${STATUS_TEXT[st.status]}` : ''}
          {st.runs > 1 ? ` (${st.runs}회차)` : ''}
          {st.detail ? ` · ${st.detail}` : ''}
          {extra}
          {st.status === 'running' && st.task && !isManager ? ` — ${st.task}` : ''}
        </Text>
      )
    }

    const rows = [line('', DIRECTOR)]
    TEAMS.forEach((team, i) => {
      const isLastTeam = i === TEAMS.length - 1
      const branch = isLastTeam ? '└ ' : '├ '
      const stem = isLastTeam ? '   ' : '│  '
      const isIdle = [team.lead, ...team.members].every(r => stateOf(o, r).status === 'waiting')
      const badge = inboxBadge(team.key)

      if (isIdle) {
        rows.push(line(branch, team.lead, ` (팀원 ${team.members.length}명)${badge}`))
        return
      }
      rows.push(line(branch, team.lead, badge))
      team.members.forEach((m, j) => {
        rows.push(line(stem + (j === team.members.length - 1 ? '└ ' : '├ '), m))
      })
    })

    return (
      <Box flexDirection="column">
        <Text bold>작업</Text>
        <Text dimColor={!o?.task}>{o?.task || '맡긴 작업 없음 — /dev-team <작업 내용>'}</Text>
        <Text> </Text>
        <Text bold>조직도</Text>
        {rows}
        <Text> </Text>
        <Text bold>예외</Text>
        {line('', FABLE, ' (사용자 요청 시에만 · /dev-team-fable)')}
        <Text> </Text>
        <Text bold>열린 타 팀 요청 ({openReqs.length}건)</Text>
        {openReqs.length === 0 && <Text dimColor>없음</Text>}
        {openReqs.slice(0, 6).map(r => (
          <Text bold={r.priority === 'P0'}>
            {r.priority} {r.id} {TEAM_NAME[r.from]}→{TEAM_NAME[r.to]} · {r.title} ({REQ_STATUS_TEXT[r.status]})
          </Text>
        ))}
        {openReqs.length > 6 && <Text dimColor>외 {openReqs.length - 6}건 — .dev-team/requests.md</Text>}
        <Text> </Text>
        <Text dimColor>○ 대기  ◐ 진행 중  ● 완료  ✕ 실패  📨 받은 요청</Text>
        <Button
          key="reset"
          label="진행 현황 초기화"
          onPress={async () => {
            await update($, org, cur => (cur === null ? null : blank('', cur.agents)))
            $.ui.status(undefined)
            await writeLive($, { onlyIfExists: true })
          }}
        />
      </Box>
    )
  })
}
