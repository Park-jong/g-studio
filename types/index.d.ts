export type RoleStatus = 'waiting' | 'running' | 'done' | 'failed'
export type RoleState = { status: RoleStatus; runs: number; task?: string; detail?: string }
export type Org = {
  /** 디렉터에게 맡긴 작업 (없으면 개별 호출만 있었던 상태) */
  task: string
  /** 역할 이름(agent 이름에서 gamestudio: 를 뺀 것) → 상태 */
  roles: Record<string, RoleState>
  /** 실행된 subagent id → 역할 이름. 누가 누구를 불렀는지 판정하는 데 쓴다 */
  agents: Record<string, string>
}

export type TeamKey = 'design' | 'tech' | 'content' | 'qa'
export type Priority = 'P0' | 'P1' | 'P2' | 'P3'
export type ReqStatus = 'open' | 'accepted' | 'in_progress' | 'done' | 'rejected'
export type ReqEvent = { at: string; by: string; status: ReqStatus; note?: string }
export type Req = {
  id: string
  from: TeamKey | 'user'
  to: TeamKey
  kind: 'requirement' | 'feedback'
  title: string
  detail: string
  priority: Priority
  priorityReason: string
  /** 관련 단계 (TODO.md). 예전 기록과 호환되도록 이름은 그대로 둔다 */
  milestone?: string
  status: ReqStatus
  createdAt: string
  history: ReqEvent[]
}

declare module 'claude-code' {
  interface PluginState {
    gamestudio: {
      org: Shaped<Org | null>
      /** .dev-team/requests.json 의 사본 (패널 표시용) */
      requests: Shaped<Req[]>
      /** 이번 사용자 메시지가 Fable agent 작업을 요청했는가 (사용자 전용 agent 호출 허가) */
      fablePermit: Shaped<boolean>
    }
  }
}
