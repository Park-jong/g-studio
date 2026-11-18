import { DEFAULT_SKIN_ID, type AssetDef, type SkinDef } from './skinTypes';

/**
 * 스킨·에셋 등록부. 새 스킨은 skins.ts 데이터에 추가만 하면 목록과 선택 화면에 나타나야 한다
 * (전투 로직이나 화면 코드에 조건문을 추가하지 않는다).
 */
export class SkinRegistry {
  private readonly skins = new Map<string, Map<string, SkinDef>>();
  private readonly assets = new Map<string, AssetDef>();
  private readonly missingAssets = new Set<string>();

  constructor(assets: readonly AssetDef[], skins: readonly SkinDef[]) {
    for (const a of assets) {
      if (this.assets.has(a.key)) throw new Error(`에셋 키 중복: ${a.key}`);
      this.assets.set(a.key, a);
    }
    for (const s of skins) this.add(s);
    for (const [subject, bySkin] of this.skins) {
      if (!bySkin.has(DEFAULT_SKIN_ID)) throw new Error(`${subject}에 "${DEFAULT_SKIN_ID}" 스킨이 없습니다`);
    }
  }

  private add(s: SkinDef): void {
    if (!/^[a-z]+:[A-Za-z0-9_-]+$/.test(s.subjectKey)) throw new Error(`대상 키 형식 오류(분류:종류ID): ${s.subjectKey}`);
    if (!s.skinId) throw new Error(`${s.subjectKey}: 빈 스킨 ID`);
    if (s.assetKey !== undefined && !this.assets.has(s.assetKey)) {
      throw new Error(`${s.subjectKey}/${s.skinId}: 등록되지 않은 에셋 ${s.assetKey}`);
    }
    for (const [state, clip] of Object.entries(s.clips ?? {})) {
      if (!clip || clip.frames.length === 0) throw new Error(`${s.subjectKey}/${s.skinId}/${state}: 빈 프레임 목록`);
      if (!(clip.fps > 0)) throw new Error(`${s.subjectKey}/${s.skinId}/${state}: fps는 0보다 커야 합니다`);
    }
    let bySkin = this.skins.get(s.subjectKey);
    if (!bySkin) {
      bySkin = new Map();
      this.skins.set(s.subjectKey, bySkin);
    }
    if (bySkin.has(s.skinId)) throw new Error(`스킨 중복: ${s.subjectKey}/${s.skinId}`);
    bySkin.set(s.skinId, s);
  }

  subjects(): string[] {
    return [...this.skins.keys()];
  }

  list(subjectKey: string): SkinDef[] {
    return [...(this.skins.get(subjectKey)?.values() ?? [])];
  }

  has(subjectKey: string, skinId: string): boolean {
    return this.skins.get(subjectKey)?.has(skinId) ?? false;
  }

  /** 없는 스킨이면 그 대상의 기본 스킨. 대상 자체가 없으면 오류 (코드 실수) */
  get(subjectKey: string, skinId: string = DEFAULT_SKIN_ID): SkinDef {
    const bySkin = this.skins.get(subjectKey);
    if (!bySkin) throw new Error(`등록되지 않은 대상: ${subjectKey}`);
    return bySkin.get(skinId) ?? bySkin.get(DEFAULT_SKIN_ID)!;
  }

  allAssets(): AssetDef[] {
    return [...this.assets.values()];
  }

  /** 로딩 실패한 에셋을 기록한다. 그 에셋을 쓰는 스킨은 도형으로 대체 표시된다 */
  markMissing(assetKey: string): void {
    this.missingAssets.add(assetKey);
  }

  /** 이 스킨을 이미지로 그릴 수 있는지 */
  canUseImage(skin: SkinDef): boolean {
    return skin.assetKey !== undefined && !this.missingAssets.has(skin.assetKey);
  }
}
