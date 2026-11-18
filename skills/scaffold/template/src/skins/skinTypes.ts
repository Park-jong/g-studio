/**
 * 스킨 = 한 캐릭터(대상)의 외형 묶음. 전투 수치는 절대 담지 않는다.
 * - 대상 키(subjectKey): "분류:종류ID" (예: "hero:player", "ally:goblin", "enemy:slime")
 * - 스킨 ID(skinId): 대상 안에서 구분 ("default", "summer" ...). 모든 대상에 "default"가 있어야 한다.
 * - 화면 표시 이름이나 파일 경로를 식별자로 쓰지 않는다 (이름이 바뀌어도 저장된 선택이 유지되도록).
 */
export type AnimationState = 'idle' | 'walk' | 'attack' | 'hit' | 'spawn' | 'death';

export const ANIMATION_STATES: readonly AnimationState[] = ['idle', 'walk', 'attack', 'hit', 'spawn', 'death'];

/** 이미지가 없을 때 그리는 도형 */
export interface PlaceholderLook {
  shape: 'rect' | 'circle';
  color: number;
  width: number;
  height: number;
}

export interface ClipDef {
  /** 에셋 안의 프레임 (spritesheet는 번호, atlas는 프레임 이름). 단일 image는 [0] */
  frames: Array<string | number>;
  fps: number;
  loop: boolean;
}

export interface SkinDef {
  subjectKey: string;
  skinId: string;
  /** 선택 화면 표시 이름 */
  name: string;
  /** 이미지가 없거나 로딩에 실패했을 때 쓰는 도형 (항상 필요) */
  placeholder: PlaceholderLook;
  /** 이미지 에셋 (AssetDef.key). 없으면 도형으로만 표시 */
  assetKey?: string;
  /** 원본 이미지가 바라보는 방향. 반대로 움직이면 좌우 반전 */
  facing?: 'right' | 'left';
  /** 기준점 (0~1). 발 위치 기준이면 { x: 0.5, y: 1 } */
  origin?: { x: number; y: number };
  /** 화면 표시 높이(px). 너비는 비율 유지 */
  displayHeight?: number;
  clips?: Partial<Record<AnimationState, ClipDef>>;
}

/** public/ 아래 이미지 파일 등록 정보 */
export type AssetDef =
  | { key: string; type: 'image'; url: string }
  | { key: string; type: 'spritesheet'; url: string; frameWidth: number; frameHeight: number; margin?: number; spacing?: number }
  | { key: string; type: 'atlas'; url: string; atlasUrl: string };

/** 저장되는 것은 선택 ID뿐 (이미지·텍스처·애니메이션 진행률은 저장하지 않는다) */
export interface SkinSelectionData {
  selectedBySubject: Record<string, string>;
}

export const DEFAULT_SKIN_ID = 'default';
