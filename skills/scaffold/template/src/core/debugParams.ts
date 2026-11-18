/**
 * 개발·검증용 URL 파라미터. 검증 에이전트와 사람이 특정 상황으로 바로 들어가 확인할 때 쓴다.
 * 새 파라미터를 추가하면 CLAUDE.md의 "확인용 URL"에도 적는다.
 *
 * - ?stage=N      타이틀을 건너뛰고 N번 스테이지(0부터)로 바로 시작
 * - ?seed=N       난수 시드 고정
 * - ?resetSave=1  시작할 때 저장 데이터 삭제
 * - ?skin=대상키:스킨ID,...  저장과 무관하게 스킨을 임시 적용 (예: ?skin=hero:player:summer)
 */
export interface DebugParams {
  stage: number | null;
  seed: number | null;
  resetSave: boolean;
  skins: Record<string, string>;
}

function intOrNull(v: string | null): number | null {
  if (v === null || v.trim() === '') return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

export function parseDebugParams(search: string): DebugParams {
  const q = new URLSearchParams(search);
  const skins: Record<string, string> = {};
  for (const pair of (q.get('skin') ?? '').split(',')) {
    const i = pair.lastIndexOf(':');
    if (i > 0 && i < pair.length - 1) skins[pair.slice(0, i)] = pair.slice(i + 1);
  }
  return {
    stage: intOrNull(q.get('stage')),
    seed: intOrNull(q.get('seed')),
    resetSave: q.get('resetSave') === '1',
    skins,
  };
}
