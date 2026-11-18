import { isRecord } from '../core/storage';
import type { SkinRegistry } from './SkinRegistry';
import { DEFAULT_SKIN_ID, type SkinDef, type SkinSelectionData } from './skinTypes';

/** 저장된 선택을 등록부 기준으로 보정한다. 없는 대상·스킨은 버리고 기본값을 쓴다 */
export function sanitizeSkinSelection(raw: unknown, registry: SkinRegistry): SkinSelectionData {
  const out: SkinSelectionData = { selectedBySubject: {} };
  if (!isRecord(raw) || !isRecord(raw.selectedBySubject)) return out;
  for (const [subject, skinId] of Object.entries(raw.selectedBySubject)) {
    if (typeof skinId === 'string' && skinId !== DEFAULT_SKIN_ID && registry.has(subject, skinId)) {
      out.selectedBySubject[subject] = skinId;
    }
  }
  return out;
}

/** 대상별로 고른 스킨. 전투 시작 때 snapshot()으로 복사해 그 판 전체에 같은 스킨을 쓴다 */
export class SkinSelection {
  private data: SkinSelectionData;

  constructor(
    private readonly registry: SkinRegistry,
    initial: SkinSelectionData = { selectedBySubject: {} },
    /** URL ?skin= 같은 임시 덮어쓰기 (저장하지 않음) */
    private readonly overrides: Record<string, string> = {},
  ) {
    this.data = sanitizeSkinSelection(initial, registry);
  }

  selectedId(subjectKey: string): string {
    const o = this.overrides[subjectKey];
    if (o !== undefined && this.registry.has(subjectKey, o)) return o;
    return this.data.selectedBySubject[subjectKey] ?? DEFAULT_SKIN_ID;
  }

  resolve(subjectKey: string): SkinDef {
    return this.registry.get(subjectKey, this.selectedId(subjectKey));
  }

  /** 선택을 바꾼다. 등록되지 않은 스킨이면 false */
  select(subjectKey: string, skinId: string): boolean {
    if (!this.registry.has(subjectKey, skinId)) return false;
    if (skinId === DEFAULT_SKIN_ID) delete this.data.selectedBySubject[subjectKey];
    else this.data.selectedBySubject[subjectKey] = skinId;
    return true;
  }

  /** 다음 스킨으로 순환 (미리보기·디버그용) */
  cycle(subjectKey: string): SkinDef {
    const list = this.registry.list(subjectKey);
    const i = list.findIndex((s) => s.skinId === this.selectedId(subjectKey));
    const next = list[(i + 1) % list.length];
    this.select(subjectKey, next.skinId);
    return next;
  }

  snapshot(): SkinSelectionData {
    return { selectedBySubject: { ...this.data.selectedBySubject } };
  }
}
